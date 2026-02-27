import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo-login.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      if (signInError.message?.includes('Email not confirmed')) {
        setError('E-mail não confirmado. Verifique sua caixa de entrada.');
      } else {
        setError('E-mail ou senha incorretos.');
      }
    } else {
      navigate('/loading');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setForgotSent(true);
    }
  };

  if (forgotMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-card px-4">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <img src={logoImg} alt="NutriQuali IA" className="w-55 mb-4" />
          </div>
          <h2 className="text-xl font-bold text-foreground text-center mb-6">Recuperar senha</h2>

          {forgotSent ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">Link de recuperação enviado para <strong>{email}</strong>.</p>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); }} className="text-primary text-sm">← Voltar ao login</button>
            </div>
          ) : (
            <>
              {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4">{error}</div>}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">E-mail</label>
                  <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-xl bg-primary py-3.5 text-primary-foreground font-semibold text-base disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>
              <div className="text-center mt-4">
                <button onClick={() => setForgotMode(false)} className="text-primary text-sm">← Voltar ao login</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-card px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <img src={logoImg} alt="NutriQuali IA" className="w-55 mb-4" />
        </div>

        <h2 className="text-xl font-bold text-foreground text-center mb-6">Bem-vindo ao NutriQuali IA</h2>

        {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Senha</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-12"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-primary py-3.5 text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button onClick={() => setForgotMode(true)} className="text-primary text-sm">Esqueci minha senha</button>
        </div>
        <div className="text-center mt-6 text-sm text-muted-foreground">
          Não tem conta? <Link to="/signup" className="text-primary font-medium">Criar conta</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
