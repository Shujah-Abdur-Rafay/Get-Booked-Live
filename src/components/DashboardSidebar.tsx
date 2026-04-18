import { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LucideIcon } from "lucide-react";

export type NavItem<T extends string> = {
  title: string;
  value: T;
  icon: LucideIcon;
  count?: number;
};

interface Props<T extends string> {
  items: NavItem<T>[];
  activeView: T;
  onViewChange: (view: T) => void;
  accentColor: string;
  roleLabel: string;
  roleIcon: LucideIcon;
  displayName?: string;
}

export default function DashboardSidebar<T extends string>({
  items,
  activeView,
  onViewChange,
  accentColor,
  roleLabel,
  roleIcon: RoleIcon,
  displayName,
}: Props<T>): JSX.Element {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="pt-16">
        {/* Role identity */}
        {!collapsed && (
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center gap-2.5 mb-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <RoleIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
              </div>
              <span className="font-display text-xs font-bold lowercase text-foreground truncate">
                {displayName ?? roleLabel}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground lowercase pl-[38px] font-body">{roleLabel}</p>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center pt-5 pb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <RoleIcon className="w-4 h-4" style={{ color: accentColor }} />
            </div>
          </div>
        )}

        <div className="px-3 py-1.5">
          <div className="h-px bg-border" />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = activeView === item.value;
                return (
                  <SidebarMenuItem key={item.value}>
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full pointer-events-none z-10"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.value)}
                      isActive={isActive}
                      className="cursor-pointer group"
                    >
                      <item.icon
                        className="w-4 h-4 shrink-0 transition-colors"
                        style={isActive ? { color: accentColor } : undefined}
                      />
                      {!collapsed && (
                        <span className="lowercase text-xs font-display">{item.title}</span>
                      )}
                      {!collapsed && item.count !== undefined && item.count > 0 && (
                        <span
                          className="ml-auto text-[10px] font-display font-semibold tabular-nums rounded-md px-1.5 py-0.5 min-w-[20px] text-center"
                          style={{
                            backgroundColor: `${accentColor}15`,
                            color: accentColor,
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
