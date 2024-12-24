import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Icon } from "@/components/ui/icon";

export function NavBasic() {
  const projects = [
    {
      name: "Home",
      url: "#",
      icon: <Icon name="Home" />,
    },
    {
      name: "Search",
      url: "#",
      icon: <Icon name="Search" />,
    },
    // {
    //   name: "Inbox",
    //   url: "#",
    //   icon: <Icon name="Inbox" />,
    // },
  ] as {
    name: string;
    url: string;
    icon: React.ReactNode;
  }[];

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url}>
                {item.icon}
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
