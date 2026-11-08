function o(){const e=new Set;return{register(r){return e.add(r),{open(){for(const t of e)t!==r&&t()},destroy(){e.delete(r)}}}}}export{o as createNavigationDisclosures};
