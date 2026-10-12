"""
app.py
------
Flask server for The Cozy Table.

This file:
1. Serves the pages (/, /menu, /cart, /checkout)
2. Receives the cart from the browser and returns the calculated bill (/api/bill)
3. Provides a sample "place order" route (/api/place-order)

There is no database and no order is stored.
The cart lives in the browser's localStorage (handled by JavaScript).
"""

import secrets

from flask import Flask, jsonify, render_template, request

import restaurant

app = Flask(__name__)


# ---------------------------------------------------------------
# Context processor: makes this data available in every template
# ---------------------------------------------------------------
@app.context_processor
def inject_globals():
    return {
        "restaurant": restaurant.RESTAURANT_INFO,
        "discount_percent": int(restaurant.DISCOUNT_RATE * 100),
        "tax_percent": int(restaurant.TAX_RATE * 100),
        "min_discount_amount": int(restaurant.MIN_DISCOUNT_AMOUNT),
        "max_quantity": restaurant.MAX_QUANTITY_PER_ITEM,
    }


# ---------------------------------------------------------------
# Page routes (these return HTML pages)
# ---------------------------------------------------------------
@app.route("/")
def home():
    # Show a few popular items on the home page
    items = restaurant.get_menu_items()
    popular = [item for item in items if item["key"] in (
        "margherita pizza", "paneer burger", "cold coffee"
    )]
    return render_template("index.html", popular=popular)


@app.route("/menu")
def menu():
    return render_template(
        "menu.html",
        items=restaurant.get_menu_items(),
        categories=restaurant.CATEGORIES,
    )


@app.route("/cart")
def cart():
    return render_template("cart.html")


@app.route("/checkout")
def checkout():
    return render_template("checkout.html")


# ---------------------------------------------------------------
# API routes (JavaScript requests data here, not HTML)
# ---------------------------------------------------------------
def read_cart_from_request():
    """Extract 'cart' from the browser's JSON. Raises BillError if invalid."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "cart" not in data:
        raise restaurant.BillError("Invalid request.")
    return data["cart"]


@app.route("/api/bill", methods=["POST"])
def api_bill():
    """Receive a cart and return the authoritative bill (subtotal, discount, tax, total)."""
    try:
        cart_data = read_cart_from_request()
        bill = restaurant.calculate_bill(cart_data)
    except restaurant.BillError as error:
        return jsonify({"ok": False, "error": str(error)}), 400
    return jsonify({"ok": True, "bill": bill})


@app.route("/api/place-order", methods=["POST"])
def api_place_order():
    """
    Sample order placement.
    The cart is validated again, the bill is calculated, and a sample order
    number is returned. Nothing is saved and no real delivery happens.
    """
    try:
        cart_data = read_cart_from_request()
        bill = restaurant.calculate_bill(cart_data)
    except restaurant.BillError as error:
        return jsonify({"ok": False, "error": str(error)}), 400

    order_number = "CT-" + str(secrets.randbelow(9000) + 1000)
    return jsonify({
        "ok": True,
        "order_number": order_number,
        "bill": bill,
        "message": "Thank you! This is a demo order. Nothing is stored and no real food will be delivered.",
    })


# ---------------------------------------------------------------
# Error handling (friendly messages)
# ---------------------------------------------------------------
@app.errorhandler(404)
def page_not_found(error):
    return "Page not found. Go back to the home page.", 404


@app.errorhandler(405)
def method_not_allowed(error):
    return "This action is not allowed here.", 405


# ---------------------------------------------------------------
# Run locally
# ---------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True)