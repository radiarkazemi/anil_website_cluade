# Anil Gold Gallery — homepage design update

**Implementation brief for the AI coding agent**  
Design reference: https://anil-design-handoff-2026.radiar.chatgpt.site/  
Current production site: https://goldanil.ir/  
Language/direction: Persian, `dir="rtl"`  
Targets: responsive desktop website and installed mobile PWA

## Task

Update the **existing** Anil homepage to match the four design-reference images below as closely as practical while retaining the site's real functionality, content contracts, four themes, and accessible responsive behavior. Treat the images as visual direction, not code or factual data. Inspect the current project first. Implement in its current component system; do not replace the whole application with a static screenshot.

### Four page references, in order

1. Header, hero, live rates: https://anil-design-handoff-2026.radiar.chatgpt.site/images/Anil-homepage-01-header-hero-rates.png
2. Featured products, categories: https://anil-design-handoff-2026.radiar.chatgpt.site/images/Anil-homepage-02-products-categories.png
3. Collection, calculator, benefits: https://anil-design-handoff-2026.radiar.chatgpt.site/images/Anil-homepage-03-collection-calculator-benefits.png
4. Editorial, contact, footer: https://anil-design-handoff-2026.radiar.chatgpt.site/images/Anil-homepage-04-editorial-contact-footer.png

These are exact crops of one concept image and overlap slightly. Use their **section order, proportions, hierarchy, spacing, photo treatment, gold accents, and RTL alignment**. Text, prices, logo shapes, product details, and promises inside a generated mockup are not authoritative.

## Non-negotiable source-of-truth rules

- Preserve the existing ANIL logo asset, current routes, live rate source, search, product data, favorites/account behavior, pricing logic, and actual checkout status.
- Use the site's real product photographs for all items presented as available. Never show generated jewelry as actual inventory; never change the shape, stones, scale, or metal color of a real item.
- Use live prices and verified weights/fees from the existing application. Mockup numbers are fictional. If a weight or price is pending, show an honest pending state and a working inquiry route; do not calculate a fabricated total.
- Do not advertise online checkout, insured delivery, official invoices, guarantees, or nationwide shipping unless those services are actually supported and verified in the current business workflow. The shop is physically in **Abhar**. Remove or correct any sample Tehran address/phone in the existing footer after verifying real contact details.
- Preserve all four themes: **شب طلایی، عاج روشن، نوآر، رزگلد**. The selected theme persists across browser sessions and installed PWA launches. Imagery stays natural; theme tokens control surrounding surfaces, text, borders and accents.

## Page specification, top to bottom

### 1. Header

Desktop: compact single-row header. Original ANIL logo at the far right; navigation and search in the main line; account/cart or inquiry affordances and four theme choices without crowding. Search has a visible label or placeholder and a clear focus state. The selected theme is apparent and every swatch has an accessible name.

Mobile: compact actual logo, search trigger/field, and menu or relevant action; no squeezed desktop navigation. Respect the device safe area. Keep navigation actions at comfortable touch size. If a cart does not lead to a functioning customer path, do not put a prominent add-to-cart control in the header.

### 2. Hero

Use the existing black-and-gold identity: photo/artwork on **left**, heading and actions on **right** on desktop. Keep the approved Persian headline **«طلا، آن‌گونه که باید بدرخشد»** if it is still the site copy. Make the hero shorter than the current oversized version so rates and the start of products come sooner. One prominent CTA **«مشاهده محصولات»**, one quieter rate link. Maintain a dark reading zone behind the heading; use one restrained golden light field rather than dense floating particles.

On mobile, use a compact stacked hero with the jewelry image fully recognizable, readable RTL copy and a full-width primary action. Avoid autoplay sliders. The hero image is campaign artwork only; if existing real brand photography is preferable, retain it instead of replacing it with generated jewelry.

### 3. Live market rates

Feature **طلای ۱۸ عیار** clearly, with currency/unit and last-update time. Secondary rate cards remain horizontally readable on desktop and scroll or collapse intelligently on mobile. Show a stale/offline state when data is old or unavailable. Never animate every price continuously or imply a live update when the feed is stale. Do not hardcode the mockup values.

### 4. Featured products

Place product discovery immediately after rates. Desktop may use a five-card row or responsive carousel; mobile uses two readable columns or a swipeable row. Product photo occupies a consistent image box; put name, weight, making fee when known, price/availability, and a working detail/inquiry action in a separate text area **below** the photo. Keep text legible in every theme. Favorite actions are keyboard/touch accessible. Do not rely on hover to reveal the only way to act.

Use genuine inventory images and data here. The supplied `featured-*-PLACEHOLDER.png` files are **layout references only** and must not be published as real products.

### 5. Categories

Image-led compact tiles with gold outline, dark gradient for the HTML label, and RTL order matching the visual reference. Use only categories that exist in the real catalogue. The provided half-set image can be a sixth tile if نیم‌ست is a real route. Desktop may show a row; mobile may use two columns or horizontal scrolling with an obvious next item. Avoid a long category wall that delays products.

### 6. Curated collection banner

Wide, low banner with jewelry weighted to the right and a dark area for heading and CTA on the left as shown in the reference. The headline and link are HTML. Point the CTA to a real collection/category; do not create an empty destination. On mobile, art-direct the crop around the jewelry and shorten the text.

### 7. Price estimate/calculator

Use the **existing business calculation** and live rate source. Inputs for weight and karat, result with unit and a plain-language explanation that the number is an estimate if applicable. Keyboard, Persian digits, input validation, and screen-reader labels must work. Do not transplant the illustrated mockup result or assume a tax/fee formula from the picture.

### 8. Why Anil

Four concise service/value cards with lightweight line icons. Only display verified operational claims. A benefit card may explain live pricing or product selection if true; remove claims of shipping, checkout, or guarantees that the current shop does not offer. Keep copy short and specific rather than generic marketing filler.

### 9. Editorial strip

Use the wide editorial image as a visual break, with HTML heading and a real gallery/catalogue link. Desktop may keep the three image zones in one horizontal strip. Mobile should use an intentional crop or stacked/scrolled composition, rather than shrinking the entire panoramic image until details disappear.

### 10. Contact and footer

Contact band: Abhar location, verified address/contact route, and optional working map link. The supplied city image is **illustrative**, not a photograph of Abhar or the shop; do not caption it as a real location. Use an authentic store photo if available and approved.

Footer: original ANIL logo, concise real navigation, verified contact and social links, legal links already present in the application. No new photo is needed inside the footer. On mobile, condense link groups and leave space above the fixed PWA bottom navigation. Do not show a Tehran placeholder or sample number as real shop details.

## Asset URL map

Use these URLs as design assets. Import/download them into the project and optimize for production; do not hotlink the handoff site in the final storefront.

| Placement | Direct image URL | Status |
|---|---|---|
| Hero artwork | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/hero-gloved-hand.png | Concept campaign art; existing genuine hero photo may be better |
| Rings category | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/category-rings.png | Concept category art |
| Necklaces category | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/category-necklaces.png | Concept category art |
| Bracelets category | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/category-bracelets.png | Concept category art |
| Earrings category | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/category-earrings.png | Concept category art |
| Gold/coin category | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/category-gold-bars.png | Concept category art; use only if the category exists |
| Half-set category | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/category-half-set.png | Optional concept category art |
| Collection banner | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/collection-banner.png | Concept campaign art |
| Editorial strip | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/editorial-triptych.png | Concept campaign art |
| Contact backdrop | https://anil-design-handoff-2026.radiar.chatgpt.site/theme-assets/contact-atmosphere-ILLUSTRATIVE.png | Illustrative atmosphere, not a real location |

The five `featured-*-PLACEHOLDER.png` assets are available on the handoff page for card layout testing **only**; replace every one with real inventory media before launch.

## Responsive, theme, motion and performance requirements

- Layout checkpoints: 360, 390, 430, 768, 1024 and 1440 CSS px. No horizontal overflow, clipped Persian text or unusable controls. Check browser and installed PWA.
- Mobile bottom navigation, if the current app already supports these destinations: **خانه، محصولات، علاقه‌مندی‌ها، حساب**. Keep safe-area padding; adapt it around keyboard, search and sheets. Preserve deep links and back navigation.
- Theme switching updates background, foreground, border, overlay and control states coherently in about 200–300 ms. Initialize the saved theme before first paint to avoid a wrong-theme flash. Avoid tinting product photography.
- Motion: at most a short one-time hero text reveal and subtle light sweep, and restrained card hover/focus feedback. No looping glitter, autoplay video, 3D logo, heavy scroll effects, or scroll hijacking. Honor `prefers-reduced-motion`.
- Images: provide responsive AVIF/WebP variants and `srcset`/`sizes`, preserve source aspect ratios, reserve dimensions to avoid layout shift, prioritize the true hero/LCP image, lazy-load below-the-fold media. Keep headings, labels and CTAs as semantic text.
- Accessibility: logical heading order, alt text where useful, visible keyboard focus, accessible names for theme choices and icon buttons, readable contrast in all four themes and functional controls without hover.

## Delivery and acceptance

1. Inspect current routes/components/data and document anything in the mockup that conflicts with the actual site. Keep the production behavior as source of truth.
2. Implement the homepage and responsive PWA view using the four references and the verified asset choices. Do not paste the full screenshot as the page.
3. Verify all four themes, mobile and desktop, rate loading/stale states, real/missing product media, pending weight/price, search and category navigation, and current checkout-closed or inquiry flow.
4. Capture before/after screenshots at desktop and mobile. Report files changed, the real assets selected, any unverified claims removed, and measured changes in LCP/INP/CLS or a clear reason metrics could not be collected.

**Completion criterion:** It should feel recognizably like Anil's own black-and-gold site, with the sharper hierarchy and complete section sequence shown in the references, while remaining honest about real inventory, prices and services.
