import { JSX } from 'react';

export interface IBaseComponentProps {
  /**
   * forward reference
   */
  ref?: HTMLElement | ((element: HTMLElement) => void);
  /**
   * children component
   */
  children?: JSX.Element;
  /**
   * custom class
   */
  classes?: string;
}

export interface ISvgBaseComponentProps extends IBaseComponentProps {
  fillClasses?: string;
}
