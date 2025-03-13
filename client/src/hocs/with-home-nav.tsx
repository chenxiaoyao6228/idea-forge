import HomeNav from "@/pages/home/nav";

export default function WithHomeNav(Component: React.ComponentType<any>) {
  return function WithHomeNavInner(props: any) {
    return (
      <>
        <HomeNav />
        <Component {...props} />
      </>
    );
  };
}
