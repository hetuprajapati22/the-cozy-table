"""
restaurant.py
-------------
Menu and billing logic for The Cozy Table.

This file contains:
1. Restaurant settings (tax, discount)
2. The menu (15 items) - prices are defined ONLY here
3. The calculate_bill() function

Flask (app.py) imports this file. The browser never sends prices;
prices always come from this file.
"""

from decimal import Decimal, ROUND_HALF_UP

# ---------------------------------------------------------------
# Restaurant settings (change values here)
# ---------------------------------------------------------------
TAX_RATE = Decimal("0.05")            # 5% sample tax
DISCOUNT_RATE = Decimal("0.10")       # 10% discount
MIN_DISCOUNT_AMOUNT = Decimal("500")  # Minimum subtotal to get the discount
MAX_QUANTITY_PER_ITEM = 20            # Safety limit for a single item

# ---------------------------------------------------------------
# Sample restaurant information (fictional and editable)
# ---------------------------------------------------------------
RESTAURANT_INFO = {
    "name": "The Cozy Table",
    "tagline": "Good Food. Good Mood.",
    "phone": "+91 00000 00000 (sample number)",
    "email": "hello@example.com (sample email)",
    "address": "123 Sample Street, Imaginary City (fictional address)",
    "hours": [
        {"days": "Monday - Friday", "time": "10:00 AM - 10:00 PM"},
        {"days": "Saturday - Sunday", "time": "9:00 AM - 11:00 PM"},
    ],
}

# Category filter buttons on the menu page appear in this order
CATEGORIES = ["Pizza", "Main Course", "Snacks", "Beverages"]

# ---------------------------------------------------------------
# Restaurant menu (15 items). The key is the lowercase item name.
# Each item has: price (Rs.), category, veg (True/False), description.
# The image file name is generated automatically,
# e.g. "margherita pizza" -> margherita-pizza.jpg
# ---------------------------------------------------------------
MENU = {
    # Pizza
    "margherita pizza": {
        "price": 199,
        "category": "Pizza",
        "veg": True,
        "description": "Classic thin crust with tangy tomato sauce, mozzarella and fresh basil.",
    },
    "farmhouse pizza": {
        "price": 299,
        "category": "Pizza",
        "veg": True,
        "description": "Loaded with capsicum, onion, tomato, mushroom and sweet corn.",
    },
    "cheese burst pizza": {
        "price": 349,
        "category": "Pizza",
        "veg": True,
        "description": "Golden crust stuffed with molten cheese in every single bite.",
    },
    # Main Course
    "white sauce pasta": {
        "price": 229,
        "category": "Main Course",
        "veg": True,
        "description": "Penne in a creamy garlic white sauce with herbs and veggies.",
    },
    "red sauce pasta": {
        "price": 199,
        "category": "Main Course",
        "veg": True,
        "description": "Penne tossed in zesty tomato sauce with Italian seasoning.",
    },
    "veg burger": {
        "price": 129,
        "category": "Main Course",
        "veg": True,
        "description": "Crispy veggie patty, fresh lettuce and house sauce in a soft bun.",
    },
    "paneer burger": {
        "price": 169,
        "category": "Main Course",
        "veg": True,
        "description": "Spiced paneer patty with onions, mint mayo and a toasted bun.",
    },
    # Snacks
    "french fries": {
        "price": 99,
        "category": "Snacks",
        "veg": True,
        "description": "Golden, crispy fries lightly salted and served hot.",
    },
    "garlic bread": {
        "price": 149,
        "category": "Snacks",
        "veg": True,
        "description": "Toasted bread with garlic butter and a sprinkle of herbs.",
    },
    "veg sandwich": {
        "price": 119,
        "category": "Snacks",
        "veg": True,
        "description": "Grilled sandwich with fresh vegetables and tangy green chutney.",
    },
    "paneer wrap": {
        "price": 179,
        "category": "Snacks",
        "veg": True,
        "description": "Soft wrap filled with spicy paneer, crunchy veggies and sauce.",
    },
    # Beverages
    "cold coffee": {
        "price": 129,
        "category": "Beverages",
        "veg": True,
        "description": "Chilled, creamy coffee blended with ice and a hint of sweetness.",
    },
    "hot coffee": {
        "price": 89,
        "category": "Beverages",
        "veg": True,
        "description": "Freshly brewed, aromatic coffee served steaming hot.",
    },
    "fresh lime soda": {
        "price": 79,
        "category": "Beverages",
        "veg": True,
        "description": "Refreshing lime and soda, sweet or salted - your choice.",
    },
    "chocolate milkshake": {
        "price": 159,
        "category": "Beverages",
        "veg": True,
        "description": "Thick chocolate shake topped with a drizzle of chocolate syrup.",
    },
}


class BillError(Exception):
    """Raised when the cart or a quantity is invalid."""


def money(value):
    """Round a Decimal value to 2 decimal places (paise)."""
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_menu_items():
    """
    Return the menu as a list (for the HTML templates).
    Each item gets a 'key' (lowercase name), 'name' (Title Case) and 'image'.
    """
    items = []
    for key, details in MENU.items():
        items.append({
            "key": key,
            "name": key.title(),
            "price": details["price"],
            "category": details["category"],
            "veg": details["veg"],
            "description": details["description"],
            "image": key.replace(" ", "-") + ".jpg",
        })
    return items


def calculate_bill(cart):
    """
    Build the complete bill from a cart.

    Cart format: {"margherita pizza": 2, "cold coffee": 1}
    (item names and quantities only - never prices)

    Raises BillError if the input is invalid.
    """
    # 1. Check the cart type
    if not isinstance(cart, dict):
        raise BillError("Invalid cart data.")
    if not cart:
        raise BillError("Your cart is empty.")

    # 2. Validate every item (name and quantity)
    merged = {}
    for raw_name, quantity in cart.items():
        if not isinstance(raw_name, str):
            raise BillError("Invalid item name.")

        name = raw_name.strip().lower()
        if name not in MENU:
            raise BillError(f"'{raw_name[:40]}' is not on our menu.")

        # In Python, True/False are also integers, so reject them explicitly
        if isinstance(quantity, bool) or not isinstance(quantity, int):
            raise BillError(f"Quantity for {name.title()} must be a whole number.")
        if quantity <= 0:
            raise BillError(f"Quantity for {name.title()} must be greater than zero.")

        merged[name] = merged.get(name, 0) + quantity
        if merged[name] > MAX_QUANTITY_PER_ITEM:
            raise BillError(
                f"You can order at most {MAX_QUANTITY_PER_ITEM} of {name.title()}."
            )

    # 3. Look up prices from MENU and calculate the subtotal
    lines = []
    subtotal = Decimal("0")
    for name, quantity in merged.items():
        price = Decimal(MENU[name]["price"])
        line_total = price * quantity
        subtotal += line_total
        lines.append({
            "key": name,
            "name": name.title(),
            "image": name.replace(" ", "-") + ".jpg",
            "veg": MENU[name]["veg"],
            "price": float(money(price)),
            "quantity": quantity,
            "line_total": float(money(line_total)),
        })

    # 4. Discount (10% when subtotal >= 500)
    discount = Decimal("0")
    discount_applied = subtotal >= MIN_DISCOUNT_AMOUNT
    if discount_applied:
        discount = money(subtotal * DISCOUNT_RATE)

    # 5. Tax (calculated on the amount AFTER the discount)
    taxable_amount = subtotal - discount
    tax = money(taxable_amount * TAX_RATE)
    final_total = money(taxable_amount + tax)

    # 6. How much more is needed to unlock the discount
    amount_to_discount = Decimal("0")
    if not discount_applied:
        amount_to_discount = MIN_DISCOUNT_AMOUNT - subtotal

    return {
        "items": lines,
        "item_count": sum(line["quantity"] for line in lines),
        "subtotal": float(money(subtotal)),
        "discount": float(discount),
        "discount_applied": discount_applied,
        "discount_percent": int(DISCOUNT_RATE * 100),
        "amount_to_discount": float(money(amount_to_discount)),
        "taxable_amount": float(money(taxable_amount)),
        "tax": float(tax),
        "tax_percent": int(TAX_RATE * 100),
        "final_total": float(final_total),
    }


# ---------------------------------------------------------------
# This block runs only when you execute `python restaurant.py` directly.
# It does not run when Flask imports this file. It is a quick test.
# ---------------------------------------------------------------
if __name__ == "__main__":
    test_cart = {"farmhouse pizza": 2}
    bill = calculate_bill(test_cart)
    print("Test cart:", test_cart)
    print("Subtotal :", bill["subtotal"])
    print("Discount :", bill["discount"])
    print("Tax      :", bill["tax"])
    print("Total    :", bill["final_total"])
