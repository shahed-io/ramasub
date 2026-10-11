# Project architecture rules

- Admin navigation selection is derived from the current TanStack pathname, matching nested pages to their menu parent; this keeps selection correct on click, refresh and browser navigation.
- Share admin colors through semantic CSS tokens scoped to the admin shell; this keeps all admin options coherent without changing storefront styling.
