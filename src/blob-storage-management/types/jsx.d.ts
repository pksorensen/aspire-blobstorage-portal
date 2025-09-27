/// <reference types="react" />

declare global {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    interface Element extends React.JSX.Element {}
  }
}

export {}