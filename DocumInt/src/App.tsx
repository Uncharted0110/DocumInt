import { Toaster } from "../src/components/ui/toaster";
import { Toaster as Sonner } from "../src/components/ui/sonner";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "../src/pages/Index";

const App = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    
    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  </Routes>
);

export default App;