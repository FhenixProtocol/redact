import React from "react";
import { AddModeratorOutlined, DescriptionOutlined } from "@mui/icons-material";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "~~/components/ui/Button";
import { Switcher } from "~~/components/ui/Switcher";
import scaffoldConfig from "~~/scaffold.config";
import { DrawerPageName, useDrawerPushPage } from "~~/services/store/drawerStore";

export function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const pushPage = useDrawerPushPage();

  const handleThemeChange = (value: number) => {
    const newTheme = value === 0 ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <div className="p-4 pt-0 pb-0 flex flex-col gap-4 h-full">
      <div className="text-3xl text-primary font-semibold mb-3">Settings</div>
      <Button
        size="md"
        iconSize="lg"
        variant="surface"
        icon={AddModeratorOutlined}
        onClick={() => pushPage({ page: DrawerPageName.Permits, pairAddress: undefined })}
      >
        Manage Permits
      </Button>
      <Button
        size="md"
        iconSize="lg"
        variant="surface"
        icon={DescriptionOutlined}
        onClick={() => window.open("https://docs.redact.money/", "_blank")}
      >
        Documentation
      </Button>
      <Switcher
        label="Theme"
        options={[
          { description: "Light", icon: Sun },
          { description: "Dark", icon: Moon },
        ]}
        value={resolvedTheme === "light" ? 0 : 1}
        onValueChange={handleThemeChange}
        className="w-full"
      />
      <div className="flex justify-between flex-1"></div>
      <div className="text-xs text-primary">Version: {scaffoldConfig.version}</div>
    </div>
  );
}
