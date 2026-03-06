import { Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface BalanzaLoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    text?: string;
    className?: string;
}

export function BalanzaLoader({ size = 'md', text = 'Cargando...', className }: BalanzaLoaderProps) {
    const sizeMap = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    return (
        <div className={clsx("flex flex-col items-center justify-center gap-4 py-8", className)}>
            <motion.div
                animate={{
                    rotate: [-15, 15, -15],
                }}
                transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut"
                }}
                className="text-indigo-600 drop-shadow-md relative"
            >
                <Scale className={sizeMap[size]} />
            </motion.div>
            {text && (
                <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="text-sm font-semibold text-indigo-800/70 tracking-wide uppercase"
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}
