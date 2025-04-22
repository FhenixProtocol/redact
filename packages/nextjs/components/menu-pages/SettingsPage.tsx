import React from "react";
import { PermitsPage } from "./PermitsPage";
import { AddModeratorOutlined, DescriptionOutlined } from "@mui/icons-material";
import { Moon, Sun } from "lucide-react";
import { DrawerChildProps } from "~~/components/Drawer";
import { Button } from "~~/components/ui/Button";
import { Switcher } from "~~/components/ui/Switcher";
import { useTheme } from "~~/hooks/useTheme";

export function SettingsPage({ pushPage }: DrawerChildProps) {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (value: number) => {
    const newTheme = value === 0 ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <div className="p-4 pb-0 flex flex-col gap-4 h-full">
      <Button
        size="md"
        iconSize="lg"
        variant="surface"
        icon={AddModeratorOutlined}
        onClick={() =>
          pushPage &&
          pushPage({
            id: "permits-page",
            title: "Permits",
            component: <PermitsPage />,
          })
        }
      >
        Create or Share Permits
      </Button>
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
        className=""
      />
      <div className="flex justify-between flex-1"></div>
    </div>
  );
}
