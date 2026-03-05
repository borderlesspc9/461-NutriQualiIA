import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Loading from "./pages/Loading";
import Dashboard from "./pages/Dashboard";
import ColdLunchSheet from "./pages/ColdLunchSheet";
import Finalized from "./pages/Finalized";

import Cardapios from "./pages/Cardapios";
import DocumentosQualidade from "./pages/DocumentosQualidade";
import HistoricoPlanilhas from "./pages/HistoricoPlanilhas";
import AnaliseNCs from "./pages/AnaliseNCs";
import DefrostingSheet from "./pages/DefrostingSheet";
import BreakfastSheet from "./pages/BreakfastSheet";
import DinnerSheet from "./pages/DinnerSheet";
import SupperSheet from "./pages/SupperSheet";
import SnacksSheet from "./pages/SnacksSheet";
import NotFound from "./pages/NotFound";
import CustomSheetPage from "./pages/CustomSheetPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/loading" element={<ProtectedRoute><Loading /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/spreadsheet/cold-lunch" element={<ProtectedRoute><ColdLunchSheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/defrosting" element={<ProtectedRoute><DefrostingSheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/breakfast" element={<ProtectedRoute><BreakfastSheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/dinner" element={<ProtectedRoute><DinnerSheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/supper" element={<ProtectedRoute><SupperSheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/snacks" element={<ProtectedRoute><SnacksSheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/custom/:id" element={<ProtectedRoute><CustomSheetPage /></ProtectedRoute>} />
            <Route path="/finalized/:id" element={<ProtectedRoute><Finalized /></ProtectedRoute>} />
            
            <Route path="/cardapios" element={<ProtectedRoute><Cardapios /></ProtectedRoute>} />
            <Route path="/documentos-qualidade" element={<ProtectedRoute><DocumentosQualidade /></ProtectedRoute>} />
            <Route path="/historico-planilhas" element={<ProtectedRoute><HistoricoPlanilhas /></ProtectedRoute>} />
            <Route path="/analise-ncs" element={<ProtectedRoute><AnaliseNCs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
