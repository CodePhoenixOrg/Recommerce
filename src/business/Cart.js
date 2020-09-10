import cookie from 'react-cookies'
import uuid from 'react-uuid'

const CART_ID = 'cpascher_cart'

class Cart {
  constructor () {
    this._resourceURL = ''
  }

  get resourceURL () {
    return this._resourceURL
  }

  /**
   *  Return the number of articles in the cart cookie, otherwise 0
   */
  static get count () {
    let result = 0

    const json = Cart.readCart()
    result = json !== undefined ? json.length : 0

    return result
  }

  /**
   * Computes the best discount price based on the total sum of a bunch of articles
   *
   * @param {float} total
   * @param {function} callback
   */
  async getOffersFromBulk (total, callback) {
    // When total equals zero no request must be done
    // but the behavior has to remain the same
    // so we do the callback if need be
    if (total === 0) {
      if (typeof callback === 'function') {
        // Trigger callback function on resource found
        callback.call(this, 0)
      }
      return
    }

    // Actually we have something to compute
    const isbnArray = []
    const cart = Cart.readCart()

    cart.forEach((article) => {
      isbnArray.push(article.isbn)
    })

    this._resourceURL =
      'http://henri-potier.xebia.fr/books/' +
      isbnArray.join(',') +
      '/commercialOffers'

    const response = await fetch(this._resourceURL)
    const data = await response.json()
    const result = response.ok ? data : Promise.reject(data)

    console.log({ businessCart_data: result })

    if (typeof callback === 'function') {
      // Trigger callback function on resource found
      callback.call(this, data)
    }

    return result
  }

  computeDiscount (total, offers) {
    if (total === 0 || offers === undefined) {
      return 0
    }
    let discount = 0

    let totalPct = total
    let totalMinus = total
    let totalSlice = total

    offers.forEach((offer) => {
      if (offer.type === 'percentage') {
        totalPct = total * (1 - offer.value / 100)
      } else if (offer.type === 'minus') {
        totalMinus = total - offer.value
      } else if (offer.type === 'slice') {
        totalSlice =
          total > offer.sliceValue
            ? total - Math.floor(total / offer.sliceValue) * offer.value
            : total
      }
    })

    const minTotal = Math.min(totalPct, totalMinus, totalSlice)

    discount = (total - minTotal).toFixed(2)

    return discount
  }

  /**
   * Read the content of the cart cookie and return a ready-made JS object
   */
  static readCart () {
    const cart = cookie.load(CART_ID)

    return cart || []
  }

  /**
   * Add an article to the cart cookie by retrieving the data through the Button object
   *
   * @param {DOM event} event
   */
  static addToCart (event) {
    if (event === undefined || event === null) {
      return
    }

    const button = event.target
    let json = decodeURIComponent(button.dataset.json)

    const article = JSON.parse(json)
    article.keyid = uuid()
    const articles = Cart.readCart()

    articles.push(article)
    json = JSON.stringify(articles)

    cookie.save(CART_ID, json, 1)
  }

  /**
   * Remove an article from the cart by its position in the cart
   *
   * @param {int} index
   */
  static removeFromCart (keyid) {
    const cart = Cart.readCart()

    let reducedCart = []
    reducedCart = cart.reduce((reduced, iteratee) => {
      if (iteratee.keyid !== keyid) {
        reduced.push(iteratee)
      }

      return reduced
    }, reducedCart)

    const json = JSON.stringify(reducedCart)

    cookie.save(CART_ID, json, 1)
  }

  /**
   * Display the number of articles in the cart on cart button
   */
  static printCount (ref) {
    if (ref !== undefined) {
      const count = Cart.count
      ref.innerHTML = count
    }
  }
}

export default Cart
