import { ConfigType } from "./Config";

/**
 * Props needed by the Auth component
 */
export interface AuthProps {
  config: ConfigType;
  /* eslint react/no-unused-prop-types: 0 */
  children?: React.ReactNode;
}
