import { Link } from "react-router-dom";
import LogoImg from "../assets/imgs/logo.png";

export default function Logo() {
  return (
    <Link to="/" className="blog overflow-hidden flex items-center">
      <img src={LogoImg} alt="logo" className="w-6 h-6 rounded-full" />
      <span className="ml-2 font-bold text-xl">Idea Stack</span>
    </Link>
  );
}
