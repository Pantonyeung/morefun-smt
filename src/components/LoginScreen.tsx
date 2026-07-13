import { useState } from 'react';
import type { RuntimeMode } from '../domain/types';

export function LoginScreen({ mode, configErrors, busy, onLogin, onSetMode }: {
  mode: RuntimeMode;
  configErrors: string[];
  busy: boolean;
  onLogin: (email: string, password: string, deviceNumber: string) => Promise<void>;
  onSetMode: (mode: RuntimeMode) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceNumber, setDeviceNumber] = useState(localStorage.getItem('morefun.smt.device_number') || 'SMT-01');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try { await onLogin(email, password, deviceNumber); }
    catch (nextError) { setError((nextError as Error).message); }
  };

  return <main className="login-page">
    <section className="login-card">
      <div className="login-brand"><span className="brand-mark">磨飯</span><div><strong>SMT</strong><small>Store Management Terminal</small></div></div>
      <div className={`mode-banner mode-${mode}`}><strong>{mode === 'live' ? '正式模式' : mode === 'staging' ? 'Staging 試運行' : '本機 Demo'}</strong><span>{mode === 'demo' ? '所有操作只存在本機' : '需要 Firebase Staff 帳戶及 Cloudflare Worker'}</span></div>
      {configErrors.length ? <div className="setup-warning"><strong>尚未完成環境設定</strong><p>{configErrors.join('、')}</p><p>請在 Cloudflare Pages Environment Variables 配置，再重新部署。</p></div> : null}
      {mode === 'demo' ? <div className="demo-entry"><p>Demo 用於 UI／流程驗收，不會寫入 Firebase。</p><button className="button primary" onClick={() => location.reload()}>進入本機試運行</button></div> : <form onSubmit={submit}>
        <label className="field"><span>SMT 裝置編號</span><input value={deviceNumber} onChange={(event) => setDeviceNumber(event.target.value.toUpperCase())} placeholder="SMT-01" required pattern="SMT-[0-9]{2,3}" /></label>
        <label className="field"><span>職員電郵</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>密碼</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button primary wide-button" disabled={busy || Boolean(configErrors.length)}>{busy ? '登入中…' : '登入 SMT'}</button>
      </form>}
      <details className="mode-switcher"><summary>切換試運行模式</summary><div>{(['demo', 'staging', 'live'] as RuntimeMode[]).map((value) => <button key={value} className={mode === value ? 'active' : ''} onClick={() => onSetMode(value)}>{value}</button>)}</div></details>
    </section>
  </main>;
}
