function e(r,o){if(r===void 0)return o;if(!/^--[a-zA-Z_][a-zA-Z0-9_-]*$/.test(r))throw new Error("Color must name a CSS custom property");return`var(${r}, ${o})`}export{e as tokenColor};
