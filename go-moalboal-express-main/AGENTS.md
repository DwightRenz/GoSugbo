<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## App architecture
- Keep GoSugbo mock records and pricing helpers in a browser-safe data module; this isolates future service integration.
- Keep cart, demo rides and orders in a shared React provider above the route outlet; navigation must not discard customer state.
- Use distinct TanStack routes for customer sections and shared reusable UI; secondary flow steps can use section-local state.
- Do not add backend persistence to this frontend-only prototype; browser session storage restores demo state after refresh.
