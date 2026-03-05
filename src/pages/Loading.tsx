import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoIcon from '@/assets/logo-icon.png';

const Loading = () => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => navigate('/dashboard'), 2200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-card px-4">
      {!imgError ? (
        <img
          src={logoIcon}
          alt="NutriQuali IA"
          className="w-28 h-28 mb-10 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-28 h-28 mb-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary">N</span>
        </div>
      )}
      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-loading-bar" />
      </div>
      <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
    </div>
  );
};

export default Loading;
