import { Check, User, Mail, Phone, CreditCard, ChevronRight } from "lucide-react";

interface CheckoutProgressProps {
  currentStep: 1 | 2;
  onStepClick: (step: 1 | 2) => void;
  isStep1Valid: boolean;
}

export function CheckoutProgress({ currentStep, onStepClick, isStep1Valid }: CheckoutProgressProps) {
  const steps = [
    { id: 1, label: "Information", icon: User },
    { id: 2, label: "Payment", icon: CreditCard },
  ];

  return (
    <div className="relative mb-8 md:mb-12">
      <div className="flex items-center justify-between max-w-xs mx-auto">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id || (step.id === 1 && isStep1Valid && currentStep === 2);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => (step.id === 1 || isStep1Valid) && onStepClick(step.id as 1 | 2)}
                  disabled={step.id === 2 && !isStep1Valid}
                  className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 relative z-10
                    ${isCompleted ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : 
                      isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : 
                      "bg-white border border-slate-100 text-slate-400"}
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" strokeWidth={3} /> : <Icon className="w-5 h-5" />}
                  
                  {isActive && (
                    <span className="absolute -inset-2 rounded-[1.25rem] border-2 border-primary/20 animate-pulse" />
                  )}
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? "text-primary" : "text-muted-foreground/60"}`}>
                  {step.label}
                </span>
              </div>
              
              {idx < steps.length - 1 && (
                <div className="w-12 md:w-20 h-px bg-border mx-2 -mt-6 relative overflow-hidden">
                  <div 
                    className="absolute inset-0 bg-primary transition-transform duration-700 origin-left" 
                    style={{ transform: `scaleX(${isCompleted ? 1 : 0})` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
