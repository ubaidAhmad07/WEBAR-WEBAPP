import { getPublicMenu } from "@/lib/menu";
import MenuHome from "@/components/menu/MenuHome";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const menu = getPublicMenu();
  return <MenuHome menu={menu} />;
}
