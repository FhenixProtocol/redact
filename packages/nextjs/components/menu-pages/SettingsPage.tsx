import React from "react";
import { Switcher } from "~~/components/ui/Switcher";
import { Button } from "~~/components/ui/Button";
import { Moon, Sun } from "lucide-react";
import { AddModeratorOutlined, DescriptionOutlined } from '@mui/icons-material';
import { useTheme } from "~~/hooks/useTheme";
import { PermitsPage } from "./PermitsPage";
import { DrawerChildProps } from "~~/components/Drawer";

export function SettingsPage({ pushPage }: DrawerChildProps) {
    const { theme, setTheme } = useTheme();
  
    const handleThemeChange = (value: number) => {
      const newTheme = value === 0 ? 'light' : 'dark';
      setTheme(newTheme);
    };

    return (
      <div className="p-4 flex flex-col gap-4">
        <Button size="md" iconSize="lg" variant="surface" icon={AddModeratorOutlined}
        onClick={() => pushPage && pushPage({
                id: "permits-page",
                title: "Permits",
                component: <PermitsPage />,
              })}
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
            { description: "Dark", icon: Moon }
          ]}
          value={theme === 'light' ? 0 : 1}
          onValueChange={handleThemeChange}
          className=""
        />

      </div>
    );
  }