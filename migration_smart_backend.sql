-- RPC: Submit Leave Request
CREATE OR REPLACE FUNCTION rpc_submit_leave_request(
  p_start_date DATE,
  p_end_date DATE,
  p_leave_type_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_total_days INT := 0;
  v_balance INT;
  v_is_quota_deduction BOOLEAN;
  v_current_date DATE;
  v_holiday_count INT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Get Leave Type info
  SELECT is_quota_deduction INTO v_is_quota_deduction
  FROM leave_types
  WHERE id = p_leave_type_id;

  -- Optimization: Pre-fetch holidays count in the range
  -- Note: We still need to iterate to exclude weekends, so we can't just subtract count.
  -- But we can check if a date is a holiday more efficiently or trust the count if we filter properly.
  -- Simpler approach: Iterate days. If not weekend, check if it exists in holidays list.
  -- To avoid N+1, we can fetch all holidays in range into an array/temp table.

  -- Let's stick to the loop but optimize the holiday check if possible,
  -- or just keep it simple. The reviewer suggested optimization.
  -- "Query the count of holidays within the date range once" is only valid if we verify those holidays are on weekdays.
  -- A holiday on a Saturday shouldn't reduce the count if we already excluded Saturday.

  -- Better logic:
  -- 1. Count all days in range excluding weekends.
  -- 2. Count all holidays in range that are NOT weekends.
  -- 3. Subtract (2) from (1).

  -- 1. Total Weekdays
  -- This is tricky in pure SQL math without a calendar table, so a loop is often used.
  -- Let's stick to the loop but do the holiday check differently.

  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    -- Check if Weekend (6=Saturday, 7=Sunday)
    IF EXTRACT(ISODOW FROM v_current_date) < 6 THEN
        v_total_days := v_total_days + 1;
    END IF;
    v_current_date := v_current_date + 1;
  END LOOP;

  -- 2. Subtract Holidays that fall on Weekdays
  SELECT COUNT(*) INTO v_holiday_count
  FROM public_holidays
  WHERE date BETWEEN p_start_date AND p_end_date
  AND EXTRACT(ISODOW FROM date) < 6;

  v_total_days := v_total_days - v_holiday_count;

  IF v_total_days <= 0 THEN
     RAISE EXCEPTION 'Leave duration is 0 working days.';
  END IF;

  -- Check Balance if Quota Deduction is required
  IF v_is_quota_deduction THEN
    SELECT leave_balance INTO v_balance
    FROM profiles
    WHERE id = v_user_id;

    IF v_balance < v_total_days THEN
      RAISE EXCEPTION 'Insufficient leave balance. Required: %, Available: %', v_total_days, v_balance;
    END IF;

    -- Deduct Balance
    UPDATE profiles
    SET leave_balance = leave_balance - v_total_days
    WHERE id = v_user_id;
  END IF;

  -- Insert Leave Request
  INSERT INTO leave_requests (
    user_id,
    start_date,
    end_date,
    leave_type_id,
    reason,
    status
  ) VALUES (
    v_user_id,
    p_start_date,
    p_end_date,
    p_leave_type_id,
    p_reason,
    'pending'
  );

  RETURN jsonb_build_object(
    'success', true,
    'days_deducted', CASE WHEN v_is_quota_deduction THEN v_total_days ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Process Encashment
CREATE OR REPLACE FUNCTION rpc_process_encashment() RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_basic_salary NUMERIC;
  v_encashment_amount NUMERIC;
BEGIN
  -- FIX: Strictly use auth.uid() for security (IDOR prevention)
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get User Profile Data
  SELECT leave_balance, basic_salary INTO v_balance, v_basic_salary
  FROM profiles
  WHERE id = v_user_id;

  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'No leave balance to encash.';
  END IF;

  -- Calculate Encashment
  -- Formula: FLOOR((basic_salary / 21) * leave_balance)
  v_encashment_amount := FLOOR((v_basic_salary / 21) * v_balance);

  -- Insert into Payrolls
  -- Using columns found in payrolls_rows.sql
  INSERT INTO payrolls (
    user_id,
    encashment_amount,
    status,
    period,
    basic_salary,
    net_salary
  ) VALUES (
    v_user_id,
    v_encashment_amount,
    'paid',
    CURRENT_DATE,
    v_basic_salary,
    v_encashment_amount
  );

  -- Update Profile Balance
  UPDATE profiles
  SET leave_balance = 0
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'encashment_amount', v_encashment_amount,
    'previous_balance', v_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function: Notify Leave Status Change
CREATE OR REPLACE FUNCTION notify_leave_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      is_read
    ) VALUES (
      NEW.user_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'Leave Approved'
        ELSE 'Leave Rejected'
      END,
      'Your leave request for ' || NEW.start_date || ' has been ' || NEW.status || '.',
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_leave_status_change ON leave_requests;
CREATE TRIGGER on_leave_status_change
AFTER UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION notify_leave_status_change();
