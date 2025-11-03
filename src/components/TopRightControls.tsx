import { AuthButton } from "@/components/AuthButton";
import { Settings } from "@/components/Settings";

export const TopRightControls = () => (
  <div className="absolute top-4 right-4 flex gap-2 items-center z-10">
    <AuthButton />
    <Settings />
  </div>
);

export default TopRightControls;
