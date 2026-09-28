import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type SubmitButtonVariant = "primary" | "success" | "danger" | "warning";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button text when idle */
    label: string;
    /** Whether the button is in a loading/processing state */
    loading?: boolean;
    /** Text shown while loading (defaults to "جارٍ التحميل...") */
    loadingLabel?: string;
    /** Optional icon component (e.g. <Save size={16} />) */
    icon?: React.ReactNode;
    /** Color variant */
    variant?: SubmitButtonVariant;
}

const variantStyles: Record<SubmitButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-300",
    success: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300",
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-300",
    warning: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-300",
};

const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
    (
        {
        label,
        loading = false,
        loadingLabel = "جارٍ التحميل...",
        icon,
        variant = "primary",
        disabled,
        className = "",
        type = "submit",
        ...props
        },
        ref
    ) => {
        return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={`
            inline-flex items-center justify-center gap-2
            text-white font-bold py-2 px-4 rounded-lg
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1
            disabled:opacity-60 disabled:cursor-not-allowed
            ${variantStyles[variant]}
            ${className}
            `}
            {...props}
        >
            {loading ? (
            <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingLabel}</span>
            </>
            ) : (
            <>
                {icon && <span className="w-4 h-4">{icon}</span>}
                <span>{label}</span>
            </>
            )}
        </button>
        );
    }
);

SubmitButton.displayName = "SubmitButton";

export default SubmitButton;