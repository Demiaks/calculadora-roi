import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, Download, Star, ShieldCheck, Mail, User, Phone, Clock, CircleDollarSign, RotateCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyzbVvsm5L68kpD80xLr9L7Jf6uTRd7RQBz9zaT-01YUrTcQoYW26BCi0bdNR7Jfy-N/exec";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value);
}

// Custom Slider Component
const CustomSlider = ({ label, value, min, max, step, onChange, prefix = '', suffix = '' }: any) => (
  <div className="mb-8">
    <div className="flex justify-between items-center mb-3">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
        <span className="text-lg font-bold text-emerald-400">{prefix}{formatNumber(value)}{suffix}</span>
      </div>
    </div>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
    />
    <div className="flex justify-between text-xs text-zinc-600 mt-2 font-mono">
      <span>{prefix}{min}{suffix}</span>
      <span>{prefix}{max}{suffix}</span>
    </div>
  </div>
);

export default function App() {
  // --- ESTADOS ---
  const [step, setStep] = useState(1);
  
  // Paso 1: Métricas
  const [leadsMensuales, setLeadsMensuales] = useState<number>(100);
  const [tasaNoShow, setTasaNoShow] = useState<number>(20);
  const [tasaCierre, setTasaCierre] = useState<number>(5);
  const [tiempoRespuesta, setTiempoRespuesta] = useState<number>(4);
  const [ticketMedio, setTicketMedio] = useState<number>(1000);
  
  // Paso 2: Contacto
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState<string | undefined>('');
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  const [deseaLlamada, setDeseaLlamada] = useState(false);
  
  // Analítica & UTMs
  const [utms, setUtms] = useState({ source: '', medium: '', campaign: '' });
  
  // UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // --- EFECTOS ---
  useEffect(() => {
    // Captura de UTMs
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || '';
    const medium = params.get('utm_medium') || '';
    const campaign = params.get('utm_campaign') || '';
    
    setUtms({ source, medium, campaign });
    trackEvent('page_view', { page: 'calculadora_roi', utm_source: source });
  }, []);

  // --- ANALÍTICA (Mock Píxel/DataLayer) ---
  const trackEvent = (eventName: string, data: any = {}) => {
    console.log(`[Analytics Event] ${eventName}`, data);
    // En un entorno real: window.dataLayer.push({ event: eventName, ...data });
  };

  // --- CÁLCULOS ---
  // 1. Situación Actual
  const leads_que_asisten = leadsMensuales * (1 - (tasaNoShow / 100));
  const ventas_actuales = leads_que_asisten * (tasaCierre / 100);
  const facturacion_actual = ventas_actuales * ticketMedio;
  const leads_perdidos_totales = leadsMensuales - ventas_actuales;
  
  // 2. Impacto IA: Reducción de No-Show
  // Recupera un 40% de los que no iban a asistir mediante recordatorios
  const no_shows = leadsMensuales * (tasaNoShow / 100);
  const no_shows_recuperados = no_shows * 0.40;
  const ventas_extra_noshow = no_shows_recuperados * (tasaCierre / 100);
  const facturacion_extra_noshow = ventas_extra_noshow * ticketMedio;
  
  // 3. Impacto IA: Seguimiento
  // Recupera contacto con el 15% de los leads que asistieron pero no compraron
  const leads_no_cerrados = leads_que_asisten - ventas_actuales;
  const leads_retomados_seguimiento = leads_no_cerrados * 0.15;
  const ventas_extra_seguimiento = leads_retomados_seguimiento * (tasaCierre / 100);
  const facturacion_extra_seguimiento = ventas_extra_seguimiento * ticketMedio;
  
  // 4. Impacto IA: Tiempo de Respuesta
  // Responder en < 1 min aumenta la conversión. Asumimos un 5% de mejora relativa por cada hora de demora actual (máx 50%)
  const mejora_conversion_tiempo = Math.min(tiempoRespuesta * 5, 50) / 100;
  const ventas_extra_tiempo = ventas_actuales * mejora_conversion_tiempo;
  const facturacion_extra_tiempo = ventas_extra_tiempo * ticketMedio;
  
  // 5. Impacto IA: Cualificación
  // Aumenta un 10% el valor de la facturación base por mejor filtrado de leads
  const facturacion_extra_cualificacion = facturacion_actual * 0.10;
  
  // Facturación total proyectada
  const facturacion_con_ia = facturacion_actual + 
                             facturacion_extra_noshow + 
                             facturacion_extra_seguimiento + 
                             facturacion_extra_tiempo + 
                             facturacion_extra_cualificacion;
                             
  const dinero_dejado_en_la_mesa = facturacion_con_ia - facturacion_actual;
  const dinero_perdido_anual = dinero_dejado_en_la_mesa * 12;
  
  // --- RECOMENDACIÓN DE PRODUCTO BASADA EN MÉTRICAS REALES ---
  const getRecommendation = () => {
    // Si no hay suficientes leads, el problema principal es la captación
    if (leadsMensuales < 50) {
      return {
        name: "Paquete Captación de Leads (Embudo + Ads + Setter IA)",
        setup: "2.900 €",
        monthly: "1.000 – 5.000 €",
        baseCost: 1000,
        message: "Tu principal cuello de botella es el volumen. Necesitas un sistema completo de captación que genere prospectos calificados desde el primer día.",
        features: ["Embudo completo", "Campañas de Ads", "Setter IA de filtrado"]
      };
    } 
    // Si ya facturan bien y tienen volumen, necesitan el sistema completo para exprimir cada lead
    else if (facturacion_actual >= 15000 && leadsMensuales >= 100) {
      return {
        name: "Bases de Datos Inteligentes y Follow-up",
        setup: "Desde 1.000 €",
        monthly: "Según volumen",
        baseCost: 1000,
        message: "Ya tienes tracción y volumen. Ahora vamos a exprimir cada céntimo de tu base de datos reactivando contactos dormidos y automatizando upsells.",
        features: ["Reactivación de contactos dormidos", "Automatización de upsells", "Cross-sells", "Aumento de ticket medio"]
      };
    }
    // Si hay leads pero no asisten, el problema es el compromiso/recordatorio
    else if (tasaNoShow > 20) {
      return {
        name: "Paquete Growth (Setter + Agente de Voz IA)",
        setup: "1.500 – 3.500 €",
        monthly: "650 – 4.000 €",
        baseCost: 650,
        message: "Estás pagando por leads que luego no se presentan. Combinar un Setter IA con un Agente de Voz natural reducirá tus no-shows un 30-40%.",
        features: ["Setter IA multicanal", "Agente de voz natural", "Confirmación de citas", "Reducción de no-shows"]
      };
    }
    // Por defecto (tienen leads, asisten decentemente, pero fallan en respuesta/seguimiento)
    else {
      return {
        name: "Setter IA (Texto Multicanal)",
        setup: "1.000 – 2.500 €",
        monthly: "350 – 3.000 €",
        baseCost: 350,
        message: "Estás perdiendo ventas por no responder al instante. Un Setter IA atenderá WhatsApp, IG y web en menos de 2 minutos, 24/7.",
        features: ["Atención en < 2 minutos", "WhatsApp, Instagram, Email y Web", "Cualificación de leads", "Agenda automática"]
      };
    }
  };

  const recomendacion = getRecommendation();

  // Coste dinámico basado en el plan recomendado para que el ROI sea 100% real
  const costeServicio = recomendacion.baseCost;
  
  const beneficio_neto_mensual = dinero_dejado_en_la_mesa - costeServicio;
  const roi_multiplicador = beneficio_neto_mensual > 0 ? beneficio_neto_mensual / costeServicio : 0;
  
  const fugasDetectadas = [];
  if (tiempoRespuesta >= 1) fugasDetectadas.push("Setter IA (Respuesta lenta)");
  if (tasaNoShow > 20) fugasDetectadas.push("Voz IA (Alto No-Show)");
  if (leadsMensuales >= 100 && tasaCierre < 10) fugasDetectadas.push("Follow-up (Baja conversión)");
  if (leadsMensuales < 50) fugasDetectadas.push("Ads + Embudo (Poco volumen)");

  // Datos para el gráfico
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const mes = i + 1;
    return {
      mes: `Mes ${mes}`,
      actual: facturacion_actual * mes,
      conIA: facturacion_con_ia * mes,
    };
  });

  // --- VALIDACIONES ---
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPhoneValid = telefono ? isValidPhoneNumber(telefono) : false;
  const isStep2Valid = nombre.trim() !== '' && isEmailValid && isPhoneValid && rgpdAccepted;

  // --- HANDLERS ---
  const handleNextStep = () => {
    if (step === 1) {
      trackEvent('step_1_completed', { leadsMensuales, tasaNoShow, tasaCierre, tiempoRespuesta, ticketMedio });
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid) return;
    
    setIsSubmitting(true);
    trackEvent('form_submitted', { nombre, email, utms });

    try {
      if (GOOGLE_SHEETS_WEBHOOK_URL) {
        await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fecha: new Date().toLocaleString('es-ES'),
            nombre,
            email,
            telefono,
            leadsMensuales,
            tasaNoShow,
            tasaCierre,
            tiempoRespuesta,
            ticketMedio,
            deseaLlamada: deseaLlamada ? 'Sí' : 'No',
            productoRecomendado: recomendacion?.name || 'No determinado',
            utm_source: utms.source,
            utm_medium: utms.medium,
            utm_campaign: utms.campaign
          }),
        });
      }
      setIsSubmitting(false);
      setStep(3);
      trackEvent('results_viewed', { dinero_dejado_en_la_mesa, roi_multiplicador });
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!resultsRef.current) return;
    trackEvent('pdf_downloaded');
    
    try {
      const element = resultsRef.current;
      
      // Usamos html-to-image porque soporta oklch (Tailwind v4)
      const dataUrl = await toPng(element, { 
        backgroundColor: '#09090b',
        pixelRatio: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${element.scrollWidth}px`,
          height: `${element.scrollHeight}px`
        },
        filter: (node) => {
          if (node.classList && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        }
      });
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (img.height * pdfWidth) / img.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Añadir primera página
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      // Añadir páginas adicionales si el contenido es más largo que una página
      while (heightLeft > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('Reporte_Auditoria_IA.pdf');
    } catch (error) {
      console.error("Error al generar el PDF:", error);
    }
  };

  const handleReset = () => {
    setStep(1);
    setLeadsMensuales(100);
    setTasaNoShow(20);
    setTasaCierre(5);
    setTiempoRespuesta(4);
    setTicketMedio(1000);
    setNombre('');
    setEmail('');
    setTelefono('');
    setRgpdAccepted(false);
    setDeseaLlamada(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsappNumber = "34644473207";
  const whatsappMessage = `Hola, soy ${nombre || 'un usuario'}. He usado la Calculadora ROI y quiero implementar IA en mi negocio.\n\n📊 *Mis resultados:*\n- Facturación actual: ${formatCurrency(facturacion_actual)}/mes\n- Facturación proyectada con IA: ${formatCurrency(facturacion_con_ia)}/mes\n- Dinero que estoy perdiendo: ${formatCurrency(dinero_dejado_en_la_mesa)}/mes\n- ROI Estimado: x${formatNumber(roi_multiplicador)}\n\nMe gustaría recibir más información para recuperar este dinero.`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      {/* HEADER */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Calculator className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-lg tracking-tight">Calculadora ROI<span className="text-emerald-400">.</span></span>
          </div>
          
          {/* Progress Bar */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-emerald-400/20 border border-emerald-400/30' : 'bg-zinc-800'}`}>1</div>
              <span>Métricas</span>
            </div>
            <div className={`w-8 h-px ${step >= 2 ? 'bg-emerald-400/50' : 'bg-zinc-800'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-emerald-400/20 border border-emerald-400/30' : 'bg-zinc-800'}`}>2</div>
              <span>Contacto</span>
            </div>
            <div className={`w-8 h-px ${step >= 3 ? 'bg-emerald-400/50' : 'bg-zinc-800'}`}></div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-emerald-400' : 'text-zinc-600'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-emerald-400/20 border border-emerald-400/30' : 'bg-zinc-800'}`}>3</div>
              <span>Resultados</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 overflow-x-hidden">
        <AnimatePresence mode="wait">
          
          {/* PASO 1: MÉTRICAS */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 mb-12">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Descubre cuánto dinero estás <span className="text-emerald-400">dejando en la mesa</span>
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                  Ajusta los valores de tu negocio actual para calcular el impacto exacto que tendría implementar un sistema de IA en tus ventas.
                </p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-sm">
                <CustomSlider 
                  label="Leads mensuales que recibes"
                  value={leadsMensuales} min={10} max={2000} step={10}
                  onChange={setLeadsMensuales}
                />
                <CustomSlider 
                  label="Tasa de No-Show (Ausentismo a llamadas)"
                  value={tasaNoShow} min={0} max={80} step={1} suffix="%"
                  onChange={setTasaNoShow}
                />
                <CustomSlider 
                  label="Tasa de cierre actual"
                  value={tasaCierre} min={1} max={50} step={1} suffix="%"
                  onChange={setTasaCierre}
                />
                <CustomSlider 
                  label="Tiempo de respuesta a leads (Horas)"
                  value={tiempoRespuesta} min={1} max={48} step={1} suffix="h"
                  onChange={setTiempoRespuesta}
                />
                <CustomSlider 
                  label="Ticket medio de tu servicio/producto"
                  value={ticketMedio} min={100} max={10000} step={100} prefix="€"
                  onChange={setTicketMedio}
                />

                <button 
                  onClick={handleNextStep}
                  className="w-full mt-8 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  Continuar <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* PASO 2: CONTACTO */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4 mb-12">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                  ¿A dónde enviamos tu reporte?
                </h2>
                <p className="text-zinc-400 text-lg">
                  Necesitamos tus datos para generar tu auditoría personalizada.
                </p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <User className="w-4 h-4 text-zinc-500" /> Nombre completo
                    </label>
                    <input
                      type="text" required
                      value={nombre} onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                      placeholder="Ej. Laura García"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-500" /> Email profesional
                    </label>
                    <input
                      type="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none ${email && !isEmailValid ? 'border-red-500/50' : 'border-zinc-800'}`}
                      placeholder="laura@empresa.com"
                    />
                    {email && !isEmailValid && <p className="text-xs text-red-400">Introduce un email válido.</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-zinc-500" /> Teléfono (con prefijo)
                    </label>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <PhoneInput
                        international
                        defaultCountry="ES"
                        value={telefono}
                        onChange={setTelefono}
                        className="w-full text-white outline-none bg-transparent"
                        numberInputProps={{ className: 'bg-transparent outline-none w-full ml-2 text-white' }}
                      />
                    </div>
                    {telefono && !isPhoneValid && <p className="text-xs text-red-400">Introduce un teléfono válido.</p>}
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox" id="rgpd" required
                      checked={rgpdAccepted} onChange={(e) => setRgpdAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 bg-zinc-800"
                    />
                    <label htmlFor="rgpd" className="text-xs text-zinc-400 leading-relaxed">
                      Acepto la <a href="https://demiak.com/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">política de privacidad</a> y doy mi consentimiento para recibir comunicaciones comerciales. Tus datos están seguros.
                    </label>
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox" id="llamada"
                      checked={deseaLlamada} onChange={(e) => setDeseaLlamada(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 bg-zinc-800"
                    />
                    <label htmlFor="llamada" className="text-xs text-zinc-400 leading-relaxed">
                      Deseo ser contactado por teléfono para comentar mis resultados y evaluar si la IA encaja en mi negocio.
                    </label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button" onClick={handlePrevStep}
                      className="px-6 py-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-all flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button 
                      type="submit" disabled={!isStep2Valid || isSubmitting}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-zinc-950 font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                      {isSubmitting ? 'Generando reporte...' : 'Ver mis resultados'} <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* PASO 3: RESULTADOS */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div ref={resultsRef} className="bg-zinc-950 p-2 md:p-8 rounded-3xl">
                <div className="text-center space-y-4 mb-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Tu Auditoría de Crecimiento
                  </h2>
                  <p className="text-zinc-400 text-lg">
                    Basado en tus datos, esto es lo que estás perdiendo por no usar IA.
                  </p>
                </div>

                {/* Resumen de Datos (Visible en PDF) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                  <div className="text-center md:text-left">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Volumen Leads</p>
                    <p className="text-xl font-bold text-white">{formatNumber(leadsMensuales)} /mes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">No-Show</p>
                    <p className="text-xl font-bold text-white">{formatNumber(tasaNoShow)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Tasa Cierre</p>
                    <p className="text-xl font-bold text-white">{formatNumber(tasaCierre)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Tiempo Resp.</p>
                    <p className="text-xl font-bold text-white">{tiempoRespuesta}h</p>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Ticket Medio</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(ticketMedio)}</p>
                  </div>
                </div>

                {/* Tarjetas de Impacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  
                  {/* Tarjeta Dinero Perdido (Animada) */}
                  <div className="bg-gradient-to-br from-zinc-900 to-red-950/30 border border-red-900/50 rounded-3xl p-8 relative overflow-hidden group flex flex-col justify-between shadow-[0_0_40px_rgba(220,38,38,0.05)]">
                    {/* Fondo de resplandor rojo inferior */}
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-600/10 blur-[60px] rounded-full"></div>
                    
                    {/* Animación de monedas cayendo (Hemorragia) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                      {[
                        { left: '15%', delay: 0, duration: 3 },
                        { left: '35%', delay: 0.7, duration: 2.5 },
                        { left: '55%', delay: 1.5, duration: 3.2 },
                        { left: '75%', delay: 0.4, duration: 2.8 },
                        { left: '85%', delay: 2.1, duration: 3.5 },
                      ].map((coin, i) => (
                        <motion.div
                          key={i}
                          className="absolute top-[-10%] text-red-500/50"
                          style={{ left: coin.left }}
                          animate={{ 
                            y: ['0vh', '100vh'], 
                            opacity: [0, 1, 0],
                            rotate: [0, -180],
                            scale: [0.8, 1.2, 0.8]
                          }}
                          transition={{ 
                            duration: coin.duration, 
                            repeat: Infinity, 
                            delay: coin.delay,
                            ease: "easeIn"
                          }}
                        >
                          <CircleDollarSign className="w-6 h-6" />
                        </motion.div>
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 text-red-400 mb-6">
                        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold uppercase tracking-widest text-xs">La Hemorragia de tu Negocio</h3>
                      </div>
                      
                      <div className="flex flex-col gap-2 mb-8">
                        <p className="text-zinc-400 text-sm font-medium">Pérdida Mensual:</p>
                        <motion.p 
                          animate={{ opacity: [0.8, 1, 0.8] }} 
                          transition={{ duration: 3, repeat: Infinity }}
                          className="text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] tracking-tight"
                        >
                          {formatCurrency(dinero_dejado_en_la_mesa)}
                        </motion.p>
                      </div>

                      <div className="flex flex-col gap-1 mb-6">
                        <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Pérdida Anual Proyectada</p>
                        <p className="text-3xl font-bold text-red-400/80">{formatCurrency(dinero_perdido_anual)}</p>
                      </div>

                      <div className="bg-red-950/30 border border-red-900/30 rounded-xl p-4 mb-6">
                        <p className="text-sm text-red-200/70">
                          De <span className="text-red-400 font-bold">{formatNumber(leads_perdidos_totales)} leads</span> que pagaste por captar y no lograste cerrar.
                        </p>
                      </div>

                      {/* Gráfico de barras decreciente */}
                      <div className="flex items-end gap-2 h-24 mt-4 opacity-90">
                        {[100, 80, 60, 40, 20, 5].map((height, i) => (
                          <motion.div 
                            key={i}
                            className="flex-1 bg-gradient-to-t from-red-950/50 to-red-500/60 border-t border-red-500/50 rounded-t-sm"
                            initial={{ height: "100%" }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 2, delay: i * 0.15, ease: "circOut" }}
                          />
                        ))}
                      </div>
                      <p className="text-center text-[10px] text-red-500/60 mt-3 font-bold uppercase tracking-widest">Oportunidades esfumándose</p>
                    </div>
                  </div>

                  {/* Tarjeta Facturación Proyectada (Animada) */}
                  <div className="bg-gradient-to-br from-zinc-900 to-emerald-950/30 border border-emerald-500/30 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                    {/* Fondo de resplandor verde superior */}
                    <motion.div 
                      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }} 
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} 
                      className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/15 blur-[60px] rounded-full"
                    />
                    
                    {/* Animación de partículas subiendo (Ganancia) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                      {[
                        { left: '20%', delay: 0.2, duration: 3.5 },
                        { left: '40%', delay: 1.1, duration: 4 },
                        { left: '60%', delay: 0.5, duration: 3.2 },
                        { left: '80%', delay: 1.8, duration: 3.8 },
                      ].map((particle, i) => (
                        <motion.div
                          key={i}
                          className="absolute bottom-[-10%] w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                          style={{ left: particle.left }}
                          animate={{ 
                            y: ['0vh', '-100vh'], 
                            opacity: [0, 1, 0],
                            scale: [0.5, 1.5, 0.5]
                          }}
                          transition={{ 
                            duration: particle.duration, 
                            repeat: Infinity, 
                            delay: particle.delay,
                            ease: "easeOut"
                          }}
                        />
                      ))}
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center gap-3 text-emerald-400 mb-6">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold uppercase tracking-widest text-xs">Facturación Proyectada (con IA)</h3>
                      </div>
                      
                      <div className="flex flex-col gap-2 mb-8">
                        <p className="text-zinc-400 text-sm font-medium">Mensual:</p>
                        <motion.p 
                          animate={{ scale: [1, 1.02, 1] }} 
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)] tracking-tight"
                        >
                          {formatCurrency(facturacion_con_ia)}
                        </motion.p>
                      </div>

                      <div className="flex flex-col gap-1 mb-6">
                        <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Anual Proyectada</p>
                        <p className="text-3xl font-bold text-emerald-400/80">{formatCurrency(facturacion_con_ia * 12)}</p>
                      </div>

                      <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-4 mb-6">
                        <p className="text-sm text-emerald-200/70">
                          Frente a los <span className="text-emerald-400 font-bold">{formatCurrency(facturacion_actual)}</span> mensuales actuales.
                        </p>
                      </div>

                      {/* Gráfico de barras creciente */}
                      <div className="flex items-end gap-2 h-24 mt-4 opacity-90">
                        {[20, 40, 60, 80, 90, 100].map((height, i) => (
                          <motion.div 
                            key={i}
                            className="flex-1 bg-gradient-to-t from-emerald-950/50 to-emerald-400/60 border-t border-emerald-400/50 rounded-t-sm"
                            initial={{ height: "20%" }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 2, delay: i * 0.15, ease: "circOut" }}
                          />
                        ))}
                      </div>
                      <p className="text-center text-[10px] text-emerald-500/60 mt-3 font-bold uppercase tracking-widest">Crecimiento escalable</p>
                    </div>
                  </div>
                </div>

                {/* Impacto del Tiempo de Respuesta */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    El coste de hacerles esperar
                  </h3>
                  <p className="text-zinc-400 text-sm mb-6">
                    El 78% de los clientes compran a la primera empresa que responde. Al tardar <span className="text-white font-bold">{tiempoRespuesta} {tiempoRespuesta === 1 ? 'hora' : 'horas'}</span> en contestar, estás perdiendo ventas que se enfrían o se van a la competencia.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                      <p className="text-zinc-500 text-xs uppercase font-bold mb-2">Tu tiempo actual</p>
                      <p className="text-4xl font-black text-red-400 mb-2">{tiempoRespuesta} {tiempoRespuesta === 1 ? 'hora' : 'horas'}</p>
                      <p className="text-zinc-500 text-xs">Pérdida de interés y fuga a competidores</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 blur-3xl rounded-full"></div>
                      <p className="text-emerald-500/80 text-xs uppercase font-bold mb-2 relative z-10">Con Agente IA</p>
                      <p className="text-4xl font-black text-emerald-400 mb-2 relative z-10">&lt; 1 min</p>
                      <p className="text-emerald-500/60 text-xs relative z-10">Atención 24/7, respuesta instantánea</p>
                    </div>
                  </div>
                  <div className="mt-6 text-center p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <p className="text-sm text-emerald-400">
                      Solo por responder al instante, recuperarías <span className="font-bold text-emerald-300">{formatCurrency(facturacion_extra_tiempo)}/mes</span> adicionales.
                    </p>
                  </div>
                </div>

                {/* Gráfico Comparativo */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                  <h3 className="text-sm font-medium text-zinc-400 mb-6">Proyección a 6 meses (Acumulado)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#52525b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#52525b" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="mes" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value/1000}k`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '0.5rem' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number) => [formatCurrency(value), '']}
                        />
                        <Area type="monotone" dataKey="actual" name="Sin IA" stroke="#52525b" fillOpacity={1} fill="url(#colorActual)" isAnimationActive={false} />
                        <Area type="monotone" dataKey="conIA" name="Con IA" stroke="#34d399" fillOpacity={1} fill="url(#colorIA)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* RECOMENDACIÓN DE PRODUCTO */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>
                  
                  <div className="mb-6 relative z-10">
                    <h3 className="text-2xl font-bold text-white mb-2">Tu Plan de Acción Recomendado</h3>
                    <p className="text-zinc-400 text-lg">
                      Según tus datos, estás dejando <span className="text-emerald-400 font-bold">{formatCurrency(dinero_dejado_en_la_mesa)} al mes</span> sobre la mesa. El sistema que necesitas para recuperar ese dinero es:
                    </p>
                  </div>

                  <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                          <Star className="w-3 h-3" /> Match Perfecto
                        </div>
                        <h4 className="text-2xl font-black text-white">{recomendacion.name}</h4>
                      </div>
                      <div className="text-left md:text-right bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Inversión Estimada</p>
                        <p className="text-white font-medium text-sm">Setup: <span className="text-zinc-300">{recomendacion.setup}</span></p>
                        <p className="text-white font-medium text-sm">Mensual: <span className="text-zinc-300">{recomendacion.monthly}</span></p>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6">
                      <p className="text-emerald-400 font-medium italic">"{recomendacion.message}"</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-zinc-500 uppercase tracking-wider font-semibold mb-3">Qué incluye:</p>
                        <ul className="space-y-2">
                          {recomendacion.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-zinc-300 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {fugasDetectadas.length > 0 && (
                        <div>
                          <p className="text-sm text-zinc-500 uppercase tracking-wider font-semibold mb-3">Focos de actuación (Tus fugas):</p>
                          <div className="flex flex-wrap gap-2">
                            {fugasDetectadas.map((fuga, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                                {fuga}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ROI & CTA */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <p className="text-zinc-400 text-sm mb-2">Retorno de Inversión (ROI) Estimado</p>
                    <div className="flex flex-col md:flex-row items-center md:items-baseline gap-3 mb-2">
                      <span className="text-5xl font-black text-white">
                        {roi_multiplicador > 0 ? `x${formatNumber(roi_multiplicador)}` : 'Escalable'}
                      </span>
                      <span className={`${beneficio_neto_mensual > 0 ? 'text-emerald-400' : 'text-zinc-300'} font-medium`}>
                        {beneficio_neto_mensual > 0 ? `Beneficio neto: ${formatCurrency(beneficio_neto_mensual)}/mes` : 'El sistema se paga solo'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      *Cálculo basado en una inversión estimada de {formatCurrency(costeServicio)}/mes en el sistema IA.
                    </p>
                  </div>

                  <div className="w-full md:w-auto flex flex-col gap-3 no-print">
                    <button 
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-all"
                    >
                      <Download className="w-4 h-4" /> Descargar PDF
                    </button>
                    <a 
                      href={whatsappUrl} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      Quiero recuperar este dinero
                    </a>
                    <button 
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300 font-medium py-3 px-6 rounded-xl transition-all border border-zinc-800"
                    >
                      <RotateCcw className="w-4 h-4" /> Nuevo Cálculo
                    </button>
                    <div className="text-center space-y-1 mt-2">
                      <p className="text-xs text-emerald-400 font-medium flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Solo aceptamos 4 auditorías por semana (2 disponibles)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Proof */}
                <div className="mt-8 pt-8 border-t border-zinc-800/50 flex flex-col items-center justify-center text-center no-print">
                  <div className="flex -space-x-3 mb-3">
                    <img className="w-10 h-10 rounded-full border-2 border-zinc-950" src="https://i.pravatar.cc/100?img=11" alt="User" />
                    <img className="w-10 h-10 rounded-full border-2 border-zinc-950" src="https://i.pravatar.cc/100?img=12" alt="User" />
                    <img className="w-10 h-10 rounded-full border-2 border-zinc-950" src="https://i.pravatar.cc/100?img=13" alt="User" />
                    <img className="w-10 h-10 rounded-full border-2 border-zinc-950" src="https://i.pravatar.cc/100?img=14" alt="User" />
                  </div>
                  <div className="flex text-emerald-400 text-sm mb-1">
                    <Star fill="currentColor" className="w-4 h-4"/><Star fill="currentColor" className="w-4 h-4"/><Star fill="currentColor" className="w-4 h-4"/><Star fill="currentColor" className="w-4 h-4"/><Star fill="currentColor" className="w-4 h-4"/>
                  </div>
                  <p className="text-sm text-zinc-400">
                    <span className="text-white font-medium">+40 empresas</span> ya han escalado sus ventas con nuestros sistemas.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
