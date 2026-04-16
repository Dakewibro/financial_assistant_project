# Manual MVP Checklist

1. Start the backend with `STORAGE_MODE=memory` or a valid `MONGODB_URI`, then start the frontend with `VITE_API_BASE_URL` pointing at the backend.
2. Open `Transactions` and add a personal food expense.
3. Add a second transaction with a similar merchant name and confirm the category suggestion appears.
4. Use `Repeat last transaction` and confirm the form prefills from the latest entry.
5. Add a custom category and confirm it appears in the category selector after refresh.
6. Create a weekly or monthly cap in `Budgets` and add transactions until an alert appears on the dashboard.
7. Switch between personal and business transactions and confirm the dashboard split changes.
8. Load the `subscription-creep` scenario and confirm recurring items plus recurring-related insights appear.
9. Load the `transport-budget` scenario and confirm period-cap and category-share alerts appear.
10. Check `Reports` to confirm category totals and the scope split match the imported or entered data.
