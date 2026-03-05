import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCustomSheetById, type CustomSheet } from '@/lib/customSheets';
import { useAuth } from '@/hooks/useAuth';
import TemperatureSheet from '@/components/TemperatureSheet';

const CustomSheetPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [custom, setCustom] = useState<CustomSheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/dashboard', { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCustomSheetById(id, user?.id ?? undefined)
      .then((sheet) => { if (!cancelled) setCustom(sheet); })
      .catch(() => { if (!cancelled) setCustom(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user?.id, navigate]);

  useEffect(() => {
    if (!loading && custom === null) navigate('/dashboard', { replace: true });
  }, [loading, custom, navigate]);

  if (!id || loading) return null;
  if (custom === null) return null;

  return (
    <TemperatureSheet
      title={custom.name}
      sheetType={custom.name}
    />
  );
};

export default CustomSheetPage;
