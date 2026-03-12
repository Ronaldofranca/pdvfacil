
-- Table to track login attempts for brute force protection
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip text NOT NULL DEFAULT '',
  tentativas integer NOT NULL DEFAULT 1,
  bloqueado_ate timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_login_attempts_email ON public.login_attempts (email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts (ip);
CREATE UNIQUE INDEX idx_login_attempts_email_unique ON public.login_attempts (email);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage this table (edge functions use service role)
-- No authenticated/anon policies = no direct client access

-- Function to check and record login attempt (called from edge function)
CREATE OR REPLACE FUNCTION public.check_login_attempt(
  _email text,
  _ip text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 10,
  _block_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record login_attempts%ROWTYPE;
  _is_blocked boolean := false;
  _remaining integer;
BEGIN
  -- Clean up old records (older than block window)
  DELETE FROM public.login_attempts
  WHERE updated_at < now() - interval '1 hour';

  -- Check existing record
  SELECT * INTO _record
  FROM public.login_attempts
  WHERE email = lower(_email);

  IF _record.id IS NOT NULL THEN
    -- Check if currently blocked
    IF _record.bloqueado_ate IS NOT NULL AND _record.bloqueado_ate > now() THEN
      RETURN jsonb_build_object(
        'blocked', true,
        'blocked_until', _record.bloqueado_ate,
        'attempts', _record.tentativas
      );
    END IF;

    -- Check if window has expired (reset if so)
    IF _record.updated_at < now() - (_window_minutes || ' minutes')::interval THEN
      UPDATE public.login_attempts
      SET tentativas = 1, bloqueado_ate = NULL, updated_at = now(), ip = _ip
      WHERE id = _record.id;
      
      RETURN jsonb_build_object('blocked', false, 'attempts', 1, 'remaining', _max_attempts - 1);
    END IF;

    -- Increment attempts
    IF _record.tentativas + 1 >= _max_attempts THEN
      -- Block the account
      UPDATE public.login_attempts
      SET tentativas = _record.tentativas + 1,
          bloqueado_ate = now() + (_block_minutes || ' minutes')::interval,
          updated_at = now(),
          ip = _ip
      WHERE id = _record.id;
      
      RETURN jsonb_build_object(
        'blocked', true,
        'blocked_until', now() + (_block_minutes || ' minutes')::interval,
        'attempts', _record.tentativas + 1
      );
    ELSE
      UPDATE public.login_attempts
      SET tentativas = _record.tentativas + 1, updated_at = now(), ip = _ip
      WHERE id = _record.id;
      
      _remaining := _max_attempts - (_record.tentativas + 1);
      RETURN jsonb_build_object('blocked', false, 'attempts', _record.tentativas + 1, 'remaining', _remaining);
    END IF;
  ELSE
    -- First attempt - create record
    INSERT INTO public.login_attempts (email, ip, tentativas, updated_at)
    VALUES (lower(_email), _ip, 1, now());
    
    RETURN jsonb_build_object('blocked', false, 'attempts', 1, 'remaining', _max_attempts - 1);
  END IF;
END;
$$;

-- Function to reset attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_login_attempts(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE email = lower(_email);
END;
$$;
