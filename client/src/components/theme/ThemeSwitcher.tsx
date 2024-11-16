import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Laptop, Palette } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Slider } from "@/components/ui/slider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const appearances = [
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
    { label: "System", value: "system", icon: Laptop },
  ] as const;

  const variants = [
    { label: "Professional", value: "professional" },
    { label: "Tint", value: "tint" },
    { label: "Vibrant", value: "vibrant" },
  ] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {appearances.map(({ label, value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme({ ...theme, appearance: value })}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Style Variant</DropdownMenuLabel>
        {variants.map(({ label, value }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme({ ...theme, variant: value })}
          >
            <Palette className="mr-2 h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <div className="p-2">
          <label className="text-sm font-medium mb-2 block">
            Border Radius: {theme.radius}
          </label>
          <Slider
            value={[theme.radius]}
            min={0}
            max={2}
            step={0.25}
            onValueChange={([value]) =>
              setTheme({ ...theme, radius: value })
            }
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
