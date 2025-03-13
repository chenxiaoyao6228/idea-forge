import HomeNav from "@/pages/home/nav";

export default function WithHomeNav(Component: React.ComponentType) {
  return function WithHomeNavInner(props: any) {
    return (
      <>
        <HomeNav />
        <Component {...props} />
      </>
    );
  };
}
