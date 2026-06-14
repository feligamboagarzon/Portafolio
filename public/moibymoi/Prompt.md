# Project: Bikini E-Commerce Site Blueprint

## 1. Directory Structure
This site operates on a flat-file system to make additions and deletions instant.
- `/products/`: Contains individual `.md` files for each bikini.
- `/assets/images/products/`: Storage for all product photos.
- `/assets/images/site/`: Storage for logos, banners, and UI elements.
- `site-settings.md`: Global configuration (Brand name, social links).

## 2. Product Template (The "Easy Add" Method)
To add a new product, create a file in `/products/` (e.g., `tropical-blue-set.md`) using this format:

---
title: "Tropical Blue Bikini"
id: "TB-001"
price: 45.00
category: "Two-Piece"
status: "active"  # Change to 'hidden' to remove from shop without deleting
images:
  - "/assets/images/products/blue-front.jpg"
  - "/assets/images/products/blue-back.jpg"
description: "A high-waist vintage inspired cut in ocean blue."
---

## 3. Global Site Configuration
The `site-settings.md` file controls the website-wide images and info:

---
brand_name: "Azure Swim"
logo: "/assets/images/site/logo.png"
hero_banner: "/assets/images/site/summer-collection.jpg"
contact_email: "hello@azureswim.com"
---

## 4. Functional Requirements
- **Automatic Gallery:** The Product Detail Page must loop through the `images` list in the product's frontmatter. To remove an image, I will simply delete its line from the list.
- **Dynamic Grid:** The Shop page must scan the `/products/` folder and render a card for every file where `status: "active"`.
- **Inventory Management:** 
    - **To Delete:** Simply delete the `.md` file from the folder.
    - **To Add:** Duplicate an existing `.md` file and update the text/image paths.
- **Image Handling:** The site should look for images in `/assets/images/products/`. If I replace a file with the same name, the site updates automatically.

## 5. UI/UX Style
- **Theme:** Clean, minimalist, high-quality imagery.
- **Navigation:** [Home, Shop, Collections, About].
- **Mobile First:** The product grid must be responsive (2 columns on mobile, 4 on desktop).    