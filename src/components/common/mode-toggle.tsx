import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "../contexts/ThemeProvider";

export function ModeToggle({ className }: React.ComponentProps<typeof Button>) {
  const { theme, setTheme } = useTheme();
  const currentModeLabel = theme === "dark" ? "Tryb ciemny" : "Tryb jasny";

  return (
    <Button
      className={cn("gap-2 pr-3", className)}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      variant="outline"
    >
      <span className="relative flex h-[1.2rem] w-[1.2rem] shrink-0 items-center justify-center">
        <Sun
          aria-hidden="true"
          className="absolute h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <Moon
          aria-hidden="true"
          className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
      </span>
      <span>{currentModeLabel}</span>
      <span className="sr-only">Zmień motyw</span>
    </Button>
  );
}
