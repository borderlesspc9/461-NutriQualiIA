import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoIcon from '@/assets/logo-icon.png';

const Loading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/dashboard'), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-card">
      <img src={logoIcon} alt="NutriQuali IA" className="w-28 h-28 mb-10 object-contain" />
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-loading-bar" />
      </div>
    </div>
  );
};

export default Loading;
