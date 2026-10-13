/**
 * Clerk appearance, derived from the active Mindora theme.
 *
 * Clerk renders inside its own shadow root and cannot read our CSS custom
 * properties, so its palette has to be handed to it as literal values. That
 * makes it a per-theme object rather than a module constant — hard-coding the
 * light palette here is what previously left the sign-in and sign-up screens
 * white-on-navy while the rest of the app went neutral black.
 *
 * The dark palette is the same neutral black used by `index.css`. Blue stays
 * reserved for `colorPrimary`.
 */

const FONT_STACK =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Layout/structure — identical in both themes. */
const sharedElements = {
  rootBox: "!w-full !max-w-none",
  cardBox: "!w-full !border-0 !bg-transparent !p-0 !shadow-none",
  card: "!w-full !gap-0 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none !ring-0",

  // The product panel supplies the identity.
  headerBox: "!hidden",
  headerTitle: "!hidden",
  headerSubtitle: "!hidden",
  headerImage: "!hidden",
  footerBox: "!hidden",
  footer: "!hidden",
  segmentedControl: "!hidden",

  /*
     Google button.

     The icon inherits `currentColor`, so it is pinned to full-strength ink
     rather than the secondary tone, and the hover only shifts the surface a
     shade — a background change can never wash the logo out. The accent is
     deliberately absent here; a blue-heavy hover made the button read as a
     link and swallowed the mark.
  */
  socialButtonsBlockButton:
    "!h-11 !w-full !rounded-lg !border !border-line !bg-surface !text-sm !font-medium !text-ink !shadow-subtle hover:!border-line-strong hover:!bg-accent-ui active:!bg-sunken",
  socialButtonsBlockButton__icon: "!size-4 !text-ink",

  dividerBox: "!my-6",

  footerActionText: "!text-sm !text-ink-secondary",
  footerActionLink: "!text-sm !font-medium !text-accent",

  identityPreviewText: "!text-sm !text-ink",
  identityPreviewEditButton: "!text-accent",
  signInLink: "!hidden",
  signUpLink: "!hidden",
  forgotPassword: "!text-accent hover:!underline",
} as const;

export function clerkAppearance(isDark: boolean) {
  return {
    variables: {
      colorPrimary: isDark ? "#3b82f6" : "#2563eb",
      colorBackground: isDark ? "#0a0a0a" : "#ffffff",
      colorText: isDark ? "#f5f5f5" : "#0a0a0a",
      colorTextSecondary: isDark ? "#a1a1aa" : "#52525b",
      colorInputBackground: isDark ? "#111111" : "#ffffff",
      colorInputText: isDark ? "#f5f5f5" : "#0a0a0a",
      colorNeutral: isDark ? "#262626" : "#e4e4e7",
      colorShimmer: isDark ? "#262626" : "#eceded",
      borderRadius: "8px",
      fontFamily: FONT_STACK,
    },
    elements: {
      ...sharedElements,

      /*
         Primary submit button.

         The label colour has to be chosen per theme rather than inherited:
         white on the dark-mode blue measures 3.7:1 and fails WCAG AA at
         14px, while near-black on the same blue measures 5.7:1. Light mode
         keeps white, which is 4.6:1 on its darker blue. A hairline shadow
         gives the button weight and the active state settles it.
      */
      formButtonPrimary: [
        "!w-full !rounded-lg !border-0 !bg-accent !text-sm !font-medium",
        isDark ? "!text-black" : "!text-white",
        "hover:!bg-accent-hover active:!brightness-95",
      ].join(" "),
      formButton: [
        "!h-11 !w-full !rounded-lg !border-0 !bg-accent !text-sm !font-medium !shadow-subtle",
        isDark ? "!text-black" : "!text-white",
        "hover:!bg-accent-hover active:!brightness-95 disabled:!opacity-60",
      ].join(" "),

      // These reference our CSS tokens rather than literals, so they adapt
      // to the theme on their own — only Clerk's own `variables` block needs
      // literal values.
      dividerText: "!text-xs !text-ink-tertiary",

      /*
         Inputs.

         The focus treatment is a hairline that darkens plus a low-alpha ring,
         rather than a saturated 2px accent outline. It still marks the field
         unambiguously for keyboard users without shouting.
      */
      formFieldInput: [
        // Clerk sets an explicit height on `.cl-input` that wins over a
        // single `!h-11`, so the comfortable height is expressed as a min
        // height the box can grow into.
        "!min-h-11 !rounded-lg !border !border-line !bg-surface !text-sm !text-ink !shadow-none",
        "placeholder:!text-ink-tertiary",
        "hover:!border-line-strong",
        "focus:!border-accent/55 focus:!ring-2 focus:!ring-accent/12",
        "focus:!outline-none",
      ].join(" "),

      formFieldLabel: "!text-[0.875rem] !font-medium !text-ink",
      formFieldLabel__footnote: "!text-[0.8125rem] !text-accent",
      optionalFieldLabel: "!text-ink-tertiary",
    },
  } as const;
}