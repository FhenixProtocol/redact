import React from "react";
import { AddModeratorOutlined, DescriptionOutlined } from "@mui/icons-material";
import { Moon, Sun } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import { Switcher } from "~~/components/ui/Switcher";
import { useTheme } from "~~/hooks/useTheme";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const handleThemeChange = (value: number) => {
    const newTheme = value === 0 ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <div className="p-4 pt-0 pb-0 flex flex-col gap-4 h-full">
      <div className="text-3xl text-primary font-semibold mb-3">Settings</div>
      {/* <Button size="md" iconSize="lg" variant="surface" icon={AddModeratorOutlined}>
        Create or Share Permits
      </Button> */}
      <Button size="md" iconSize="lg" variant="surface" icon={DescriptionOutlined}>
        Documentation
      </Button>
      <Switcher
        label="Theme"
        options={[
          { description: "Light", icon: Sun },
          { description: "Dark", icon: Moon },
        ]}
        value={theme === "light" ? 0 : 1}
        onValueChange={handleThemeChange}
        className="w-full"
      />
      <div className="flex justify-between flex-1"></div>
    </div>
  );
}
