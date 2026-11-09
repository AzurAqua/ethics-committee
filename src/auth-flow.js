export function authErrorMessage(error, mode) {
  const messages = {
    email_not_confirmed: '邮箱尚未验证。请先查收邮件，或点击「重发验证邮件」。',
    invalid_credentials: '邮箱或密码不正确。请检查输入，忘记密码可通过邮件找回。',
    user_already_exists: '这个邮箱已注册，请登录或找回密码。',
    email_exists: '这个邮箱已注册，请登录或找回密码。',
    signup_disabled: '暂未开放新账号注册，请稍后再试。',
    email_provider_disabled: '暂未开放邮箱注册，请联系维护者。',
    email_address_invalid: '邮箱格式不正确，请检查后重试。',
    email_address_not_authorized: '发信服务尚未开放给这个邮箱，请通过问题反馈联系维护者。',
    over_email_send_rate_limit: '邮件发送过于频繁，请稍后再试，并检查收件箱和垃圾邮件。',
    over_request_rate_limit: '操作过于频繁，请稍后重试。',
    weak_password: '密码强度不足，请使用至少 8 个字符，并混合字母、数字或符号。',
    same_password: '新密码与原密码相同，请使用一个不同的新密码。',
    otp_expired: '邮件链接已过期或已使用，请重新发送邮件，并打开最新的一封。',
    otp_disabled: '邮件链接暂时不可用，请重新发送或反馈问题。',
    session_not_found: '登录状态已失效，请重新登录，或重新发送密码重置邮件。',
    refresh_token_not_found: '登录状态已失效，请重新登录。',
    email_confirmation_disabled: '账号验证配置尚未就绪，请通过问题反馈联系维护者。'
  };
  if (messages[error?.code]) return messages[error.code];
  if (error?.status === 429) return messages.over_request_rate_limit;
  if (error?.status >= 500) return '账号服务暂时无法完成操作。若正在发送邮件，可能是发信服务异常，请稍后重试或反馈问题。';
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return '未能连接账号服务，请检查网络后重试。你的轨道记录不会因此清空。';
  }
  return mode === 'confirm'
    ? '暂时无法验证邮件链接，请重试；若仍失败，请重新发送邮件。'
    : '暂时无法完成操作，请稍后重试。若持续失败，请通过问题反馈联系维护者。';
}

export async function submitAuth(auth, mode, { email, password, redirectUrl }) {
  let result;
  if (mode === 'login') result = await auth.signInWithPassword({ email, password });
  else if (mode === 'signup') result = await auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl } });
  else if (mode === 'resend') result = await auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl } });
  else if (mode === 'forgot') result = await auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
  else if (mode === 'reset') result = await auth.updateUser({ password });
  else throw new Error('Unknown auth operation');
  if (result.error) throw result.error;
  if (mode === 'signup' && result.data.session) {
    await auth.signOut({ scope: 'local' });
    throw Object.assign(new Error('Email confirmation required'), { code: 'email_confirmation_disabled' });
  }
  return result.data;
}

// Direct token-hash links also work when the email opens on another device.
export function readEmailLink(href) {
  const address = new URL(href);
  const token = address.searchParams.get('token_hash');
  const type = address.searchParams.get('type');
  if (!token) return null;
  return { token, type: type === 'signup' || type === 'email' ? 'email' : type === 'recovery' ? 'recovery' : null };
}

export async function confirmEmailLink(auth, link) {
  if (!link?.type) throw Object.assign(new Error('Invalid email link'), { code: 'otp_expired' });
  const { data, error } = await auth.verifyOtp({ token_hash: link.token, type: link.type });
  if (error) throw error;
  if (!data.session) throw Object.assign(new Error('Missing email session'), { code: 'otp_expired' });
  return data.session;
}
