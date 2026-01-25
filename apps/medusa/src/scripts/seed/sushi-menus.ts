import { CreateProductWorkflowInputDTO, ProductCollectionDTO, ProductTagDTO } from '@medusajs/framework/types';
import { ProductStatus } from '@medusajs/utils';
import type { ExecArgs } from '@medusajs/types';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

// Menu creation data structure
export interface MenuSeedData {
  name: string;
  courses: {
    name: string;
    dishes: {
      name: string;
      description?: string;
      ingredients: {
        name: string;
        optional?: boolean;
      }[];
    }[];
  }[];
}

// Product data for menu tickets
interface MenuTicketProductData {
  title: string;
  description: string;
  handle: string;
  price: {
    usd: number;
    cad: number;
  };
  estimatedDuration: number; // in minutes
  maxGuests: number;
  eventType: 'cooking_class' | 'plated_dinner' | 'buffet_style' | 'omakase';
  images: string[];
  availableTickets: number;
}

// Sushi Menu definitions
export const sushiMenuDefinitions: MenuSeedData[] = [
  {
    name: "Traditional Omakase Experience",
    courses: [
      {
        name: "Sake & Cocktails",
        dishes: [
          {
            name: "Junmai Daiginjo Flight",
            description: "A curated selection of three premium sake varieties, served chilled in traditional ochoko cups.",
            ingredients: [
              { name: "Junmai Daiginjo sake" },
              { name: "Junmai Ginjo sake" },
              { name: "Honjozo sake" },
              { name: "Ice" }
            ]
          },
          {
            name: "Yuzu Sake Spritz",
            description: "A refreshing cocktail blending premium sake with fresh yuzu juice and sparkling water.",
            ingredients: [
              { name: "Junmai sake" },
              { name: "Fresh yuzu juice" },
              { name: "Sparkling water" },
              { name: "Yuzu zest" },
              { name: "Simple syrup" }
            ]
          }
        ]
      },
      {
        name: "Otsumami (Appetizers)",
        dishes: [
          {
            name: "Edamame with Sea Salt",
            description: "Steamed young soybeans lightly salted with premium Okinawan sea salt.",
            ingredients: [
              { name: "Fresh edamame" },
              { name: "Okinawan sea salt" },
              { name: "Sesame oil", optional: true }
            ]
          },
          {
            name: "Agedashi Tofu",
            description: "Crispy fried silken tofu served in a savory dashi broth with grated daikon.",
            ingredients: [
              { name: "Silken tofu" },
              { name: "Potato starch" },
              { name: "Dashi broth" },
              { name: "Soy sauce" },
              { name: "Mirin" },
              { name: "Grated daikon" },
              { name: "Green onion" }
            ]
          },
          {
            name: "Sunomono Cucumber Salad",
            description: "Thinly sliced Japanese cucumber in a tangy rice vinegar dressing with wakame seaweed.",
            ingredients: [
              { name: "Japanese cucumber" },
              { name: "Rice vinegar" },
              { name: "Wakame seaweed" },
              { name: "Sesame seeds" },
              { name: "Sugar" },
              { name: "Salt" }
            ]
          }
        ]
      },
      {
        name: "Sashimi",
        dishes: [
          {
            name: "Premium Sashimi Moriawase",
            description: "Chef's selection of the finest sashimi including bluefin tuna, salmon, and yellowtail, artfully presented.",
            ingredients: [
              { name: "Bluefin tuna (akami)" },
              { name: "Scottish salmon" },
              { name: "Yellowtail (hamachi)" },
              { name: "Fresh wasabi" },
              { name: "Shiso leaves" },
              { name: "Daikon radish" },
              { name: "Soy sauce" }
            ]
          },
          {
            name: "Hotate Sashimi",
            description: "Fresh Hokkaido scallops sliced thin and served with ponzu and microgreens.",
            ingredients: [
              { name: "Hokkaido scallops" },
              { name: "Ponzu sauce" },
              { name: "Microgreens" },
              { name: "Yuzu zest" },
              { name: "Pink Himalayan salt" }
            ]
          }
        ]
      },
      {
        name: "Nigiri Selection",
        dishes: [
          {
            name: "Otoro Nigiri",
            description: "The most prized cut of bluefin tuna belly, silky and rich, atop seasoned sushi rice.",
            ingredients: [
              { name: "Otoro (fatty tuna belly)" },
              { name: "Sushi rice" },
              { name: "Wasabi" },
              { name: "Soy sauce" }
            ]
          },
          {
            name: "Uni Nigiri",
            description: "Creamy sea urchin from Hokkaido, delicately placed on sushi rice with a nori wrap.",
            ingredients: [
              { name: "Hokkaido uni (sea urchin)" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" },
              { name: "Wasabi", optional: true }
            ]
          },
          {
            name: "Ikura Gunkan",
            description: "Glistening salmon roe in a seaweed-wrapped sushi rice cup, bursting with ocean flavor.",
            ingredients: [
              { name: "Salmon roe (ikura)" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" },
              { name: "Shiso leaf", optional: true }
            ]
          },
          {
            name: "Ebi Nigiri",
            description: "Sweet butterflied shrimp, blanched to perfection and served over sushi rice.",
            ingredients: [
              { name: "Tiger shrimp" },
              { name: "Sushi rice" },
              { name: "Wasabi" },
              { name: "Soy sauce" }
            ]
          }
        ]
      },
      {
        name: "Chef's Special Rolls",
        dishes: [
          {
            name: "Dragon Roll",
            description: "Shrimp tempura and cucumber inside, topped with fresh avocado and unagi with eel sauce.",
            ingredients: [
              { name: "Shrimp tempura" },
              { name: "Cucumber" },
              { name: "Avocado" },
              { name: "Unagi (freshwater eel)" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" },
              { name: "Eel sauce" },
              { name: "Sesame seeds" }
            ]
          },
          {
            name: "Rainbow Roll",
            description: "California roll topped with an assortment of sashimi including tuna, salmon, and yellowtail.",
            ingredients: [
              { name: "Crab meat" },
              { name: "Avocado" },
              { name: "Cucumber" },
              { name: "Bluefin tuna" },
              { name: "Salmon" },
              { name: "Yellowtail" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" }
            ]
          }
        ]
      },
      {
        name: "Dessert",
        dishes: [
          {
            name: "Matcha Tiramisu",
            description: "A Japanese twist on the Italian classic, layered with matcha-soaked ladyfingers and mascarpone.",
            ingredients: [
              { name: "Matcha powder" },
              { name: "Ladyfinger cookies" },
              { name: "Mascarpone cheese" },
              { name: "Heavy cream" },
              { name: "Sugar" },
              { name: "Espresso" }
            ]
          },
          {
            name: "Mochi Ice Cream Trio",
            description: "Three flavors of delicate rice cake-wrapped ice cream: green tea, mango, and black sesame.",
            ingredients: [
              { name: "Mochiko (sweet rice flour)" },
              { name: "Green tea ice cream" },
              { name: "Mango ice cream" },
              { name: "Black sesame ice cream" },
              { name: "Sugar" },
              { name: "Cornstarch" }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Modern Fusion Sushi",
    courses: [
      {
        name: "Signature Cocktails",
        dishes: [
          {
            name: "Tokyo Mule",
            description: "Japanese whisky meets fresh ginger and lime, topped with spicy ginger beer.",
            ingredients: [
              { name: "Japanese whisky" },
              { name: "Fresh ginger" },
              { name: "Lime juice" },
              { name: "Ginger beer" },
              { name: "Ice" },
              { name: "Lime wedge" }
            ]
          },
          {
            name: "Lychee Saketini",
            description: "Premium sake shaken with lychee liqueur and fresh lychee, served in a chilled martini glass.",
            ingredients: [
              { name: "Premium sake" },
              { name: "Lychee liqueur" },
              { name: "Fresh lychee" },
              { name: "Lime juice" },
              { name: "Simple syrup" }
            ]
          },
          {
            name: "Shiso Gimlet",
            description: "A botanical cocktail with gin, fresh shiso leaves, cucumber, and a hint of citrus.",
            ingredients: [
              { name: "Gin" },
              { name: "Fresh shiso leaves" },
              { name: "Cucumber" },
              { name: "Lime juice" },
              { name: "Simple syrup" }
            ]
          }
        ]
      },
      {
        name: "Fusion Starters",
        dishes: [
          {
            name: "Tuna Tataki Tacos",
            description: "Seared bluefin tuna in crispy wonton shells with spicy mayo, mango salsa, and micro cilantro.",
            ingredients: [
              { name: "Bluefin tuna" },
              { name: "Wonton wrappers" },
              { name: "Spicy mayo" },
              { name: "Mango" },
              { name: "Red onion" },
              { name: "Jalapeño" },
              { name: "Micro cilantro" },
              { name: "Sesame oil" }
            ]
          },
          {
            name: "Wagyu Beef Tartare",
            description: "Hand-cut A5 wagyu with quail egg yolk, truffle oil, and crispy shallots.",
            ingredients: [
              { name: "A5 wagyu beef" },
              { name: "Quail egg yolk" },
              { name: "Truffle oil" },
              { name: "Crispy shallots" },
              { name: "Chives" },
              { name: "Soy sauce" },
              { name: "Sesame oil" }
            ]
          },
          {
            name: "Crispy Rice with Spicy Tuna",
            description: "Golden seared rice cakes topped with spicy tuna tartare and jalapeño aioli.",
            ingredients: [
              { name: "Sushi rice" },
              { name: "Spicy tuna" },
              { name: "Sriracha" },
              { name: "Mayonnaise" },
              { name: "Jalapeño" },
              { name: "Green onion" },
              { name: "Sesame seeds" }
            ]
          }
        ]
      },
      {
        name: "Sashimi & Crudo",
        dishes: [
          {
            name: "Hamachi Jalapeño",
            description: "Paper-thin yellowtail with jalapeño slices, ponzu, cilantro oil, and citrus zest.",
            ingredients: [
              { name: "Yellowtail (hamachi)" },
              { name: "Jalapeño" },
              { name: "Ponzu sauce" },
              { name: "Cilantro oil" },
              { name: "Yuzu zest" },
              { name: "Sea salt" }
            ]
          },
          {
            name: "Salmon Crudo with Miso",
            description: "Wild salmon with white miso dressing, pickled ginger, and toasted almonds.",
            ingredients: [
              { name: "Wild salmon" },
              { name: "White miso" },
              { name: "Rice vinegar" },
              { name: "Pickled ginger" },
              { name: "Toasted almonds" },
              { name: "Microgreens" }
            ]
          }
        ]
      },
      {
        name: "Signature Rolls",
        dishes: [
          {
            name: "Truffle Lobster Roll",
            description: "Maine lobster tempura with avocado, topped with truffle aioli and gold flakes.",
            ingredients: [
              { name: "Maine lobster" },
              { name: "Tempura batter" },
              { name: "Avocado" },
              { name: "Cucumber" },
              { name: "Truffle aioli" },
              { name: "Gold flakes" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" }
            ]
          },
          {
            name: "Volcano Roll",
            description: "Spicy crab and cream cheese inside, baked with scallop, tobiko, and spicy mayo.",
            ingredients: [
              { name: "Spicy crab meat" },
              { name: "Cream cheese" },
              { name: "Scallop" },
              { name: "Tobiko (flying fish roe)" },
              { name: "Spicy mayo" },
              { name: "Green onion" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" }
            ]
          },
          {
            name: "Black & Gold Roll",
            description: "Black rice wrapped roll with salmon, cream cheese, mango, and black sesame.",
            ingredients: [
              { name: "Black forbidden rice" },
              { name: "Salmon" },
              { name: "Cream cheese" },
              { name: "Mango" },
              { name: "Black sesame seeds" },
              { name: "Eel sauce" },
              { name: "Nori seaweed" }
            ]
          }
        ]
      },
      {
        name: "Hot Dishes",
        dishes: [
          {
            name: "Miso-Glazed Black Cod",
            description: "48-hour marinated black cod, caramelized and served with ginger bok choy.",
            ingredients: [
              { name: "Black cod (sablefish)" },
              { name: "White miso paste" },
              { name: "Mirin" },
              { name: "Sake" },
              { name: "Sugar" },
              { name: "Bok choy" },
              { name: "Fresh ginger" }
            ]
          },
          {
            name: "Wagyu Yakitori Skewers",
            description: "Grilled wagyu beef skewers with tare glaze, served with pickled vegetables.",
            ingredients: [
              { name: "Wagyu beef cubes" },
              { name: "Tare sauce" },
              { name: "Shishito peppers" },
              { name: "Pickled vegetables" },
              { name: "Shichimi togarashi" }
            ]
          }
        ]
      },
      {
        name: "Dessert",
        dishes: [
          {
            name: "Black Sesame Cheesecake",
            description: "Creamy Japanese-style cheesecake infused with roasted black sesame, topped with sesame brittle.",
            ingredients: [
              { name: "Cream cheese" },
              { name: "Black sesame paste" },
              { name: "Heavy cream" },
              { name: "Eggs" },
              { name: "Sugar" },
              { name: "Sesame brittle" }
            ]
          },
          {
            name: "Yuzu Panna Cotta",
            description: "Silky Italian custard with Japanese yuzu citrus, topped with fresh berries.",
            ingredients: [
              { name: "Heavy cream" },
              { name: "Yuzu juice" },
              { name: "Yuzu zest" },
              { name: "Gelatin" },
              { name: "Sugar" },
              { name: "Fresh berries" }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Vegetarian Zen Garden",
    courses: [
      {
        name: "Tea & Refreshments",
        dishes: [
          {
            name: "Ceremonial Matcha",
            description: "Whisked ceremonial grade matcha prepared in the traditional Japanese style.",
            ingredients: [
              { name: "Ceremonial matcha powder" },
              { name: "Hot water" },
              { name: "Bamboo whisk" }
            ]
          },
          {
            name: "Cucumber Shiso Cooler",
            description: "A refreshing non-alcoholic drink with muddled cucumber, shiso, and sparkling water.",
            ingredients: [
              { name: "Fresh cucumber" },
              { name: "Shiso leaves" },
              { name: "Lime juice" },
              { name: "Sparkling water" },
              { name: "Agave syrup" },
              { name: "Ice" }
            ]
          },
          {
            name: "Genmaicha Sake Cocktail",
            description: "Roasted rice tea-infused sake with honey and a touch of lemon.",
            ingredients: [
              { name: "Genmaicha tea" },
              { name: "Sake" },
              { name: "Raw honey" },
              { name: "Lemon juice" },
              { name: "Ice" }
            ]
          }
        ]
      },
      {
        name: "Garden Starters",
        dishes: [
          {
            name: "Vegetable Gyoza",
            description: "Pan-fried dumplings filled with cabbage, shiitake mushrooms, and ginger.",
            ingredients: [
              { name: "Napa cabbage" },
              { name: "Shiitake mushrooms" },
              { name: "Fresh ginger" },
              { name: "Garlic" },
              { name: "Green onion" },
              { name: "Gyoza wrappers" },
              { name: "Sesame oil" }
            ]
          },
          {
            name: "Shishito Peppers",
            description: "Blistered Japanese peppers with bonito-free dashi salt and lime.",
            ingredients: [
              { name: "Shishito peppers" },
              { name: "Sea salt" },
              { name: "Sesame oil" },
              { name: "Lime" },
              { name: "Kombu" }
            ]
          },
          {
            name: "Avocado Tataki",
            description: "Seared avocado slices with ponzu, radish, and microgreens.",
            ingredients: [
              { name: "Ripe avocado" },
              { name: "Ponzu sauce" },
              { name: "Watermelon radish" },
              { name: "Microgreens" },
              { name: "Sesame seeds" },
              { name: "Olive oil" }
            ]
          }
        ]
      },
      {
        name: "Maki Rolls",
        dishes: [
          {
            name: "Avocado Caterpillar Roll",
            description: "Cucumber and pickled daikon inside, topped with perfectly sliced avocado.",
            ingredients: [
              { name: "Avocado" },
              { name: "Cucumber" },
              { name: "Pickled daikon" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" },
              { name: "Sesame seeds" }
            ]
          },
          {
            name: "Sweet Potato Tempura Roll",
            description: "Crispy sweet potato tempura with avocado and spicy vegan mayo.",
            ingredients: [
              { name: "Japanese sweet potato" },
              { name: "Tempura batter" },
              { name: "Avocado" },
              { name: "Vegan spicy mayo" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" },
              { name: "Eel sauce" }
            ]
          },
          {
            name: "Shiitake Mushroom Roll",
            description: "Marinated shiitake mushrooms with asparagus and pickled ginger.",
            ingredients: [
              { name: "Shiitake mushrooms" },
              { name: "Asparagus" },
              { name: "Pickled ginger" },
              { name: "Soy sauce" },
              { name: "Mirin" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" }
            ]
          },
          {
            name: "Mango Kale Roll",
            description: "Fresh mango, massaged kale, and cucumber with a citrus-ginger dressing.",
            ingredients: [
              { name: "Fresh mango" },
              { name: "Lacinato kale" },
              { name: "Cucumber" },
              { name: "Ginger dressing" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" },
              { name: "Sesame seeds" }
            ]
          }
        ]
      },
      {
        name: "Nigiri & Inari",
        dishes: [
          {
            name: "Inari Sushi",
            description: "Sweet marinated tofu pouches filled with seasoned sushi rice and sesame.",
            ingredients: [
              { name: "Inari tofu pouches" },
              { name: "Sushi rice" },
              { name: "Rice vinegar" },
              { name: "Sesame seeds" },
              { name: "Pickled ginger", optional: true }
            ]
          },
          {
            name: "Tamagoyaki Nigiri",
            description: "Sweet Japanese egg omelet atop sushi rice with a nori band.",
            ingredients: [
              { name: "Eggs" },
              { name: "Dashi" },
              { name: "Mirin" },
              { name: "Sugar" },
              { name: "Sushi rice" },
              { name: "Nori seaweed" }
            ]
          },
          {
            name: "Shiitake Nigiri",
            description: "Soy-glazed shiitake mushroom cap over sushi rice.",
            ingredients: [
              { name: "Shiitake mushroom cap" },
              { name: "Soy sauce" },
              { name: "Mirin" },
              { name: "Sushi rice" },
              { name: "Wasabi" }
            ]
          }
        ]
      },
      {
        name: "Garden Sides",
        dishes: [
          {
            name: "Seaweed Salad",
            description: "A refreshing mix of wakame and other sea vegetables with sesame dressing.",
            ingredients: [
              { name: "Wakame seaweed" },
              { name: "Sesame oil" },
              { name: "Rice vinegar" },
              { name: "Soy sauce" },
              { name: "Sesame seeds" },
              { name: "Red pepper flakes" }
            ]
          },
          {
            name: "Miso Soup",
            description: "Traditional miso soup with tofu, wakame, and green onion.",
            ingredients: [
              { name: "White miso paste" },
              { name: "Kombu dashi" },
              { name: "Silken tofu" },
              { name: "Wakame seaweed" },
              { name: "Green onion" }
            ]
          }
        ]
      },
      {
        name: "Dessert",
        dishes: [
          {
            name: "Matcha Affogato",
            description: "Vanilla bean ice cream with a shot of freshly whisked matcha and azuki beans.",
            ingredients: [
              { name: "Vanilla bean ice cream" },
              { name: "Matcha powder" },
              { name: "Hot water" },
              { name: "Sweet azuki beans" },
              { name: "Mochi pieces", optional: true }
            ]
          },
          {
            name: "Fresh Fruit Mochi",
            description: "Seasonal fresh fruits wrapped in soft, chewy mochi rice cake.",
            ingredients: [
              { name: "Mochiko flour" },
              { name: "Fresh strawberries" },
              { name: "Fresh grapes" },
              { name: "Kiwi" },
              { name: "Sugar" },
              { name: "Cornstarch" }
            ]
          }
        ]
      }
    ]
  },
  {
    name: "Premium Sashimi Kaiseki",
    courses: [
      {
        name: "Sake Pairing",
        dishes: [
          {
            name: "Dassai 23 Junmai Daiginjo",
            description: "Ultra-premium sake with 23% rice polishing ratio, crisp and delicate.",
            ingredients: [
              { name: "Dassai 23 sake" },
              { name: "Chilled sake glass" }
            ]
          },
          {
            name: "Aged Koshu Sake",
            description: "Rare aged sake with complex caramel and umami notes.",
            ingredients: [
              { name: "Aged koshu sake" },
              { name: "Traditional sake cup" }
            ]
          }
        ]
      },
      {
        name: "Sakizuke (Amuse-Bouche)",
        dishes: [
          {
            name: "Ankimo (Monkfish Liver)",
            description: "Steamed monkfish liver with ponzu, grated momiji oroshi, and chives.",
            ingredients: [
              { name: "Monkfish liver" },
              { name: "Sake" },
              { name: "Ponzu sauce" },
              { name: "Momiji oroshi (spicy daikon)" },
              { name: "Chives" }
            ]
          },
          {
            name: "Chawanmushi",
            description: "Silky steamed egg custard with shrimp, ginkgo nut, and mitsuba.",
            ingredients: [
              { name: "Eggs" },
              { name: "Dashi" },
              { name: "Shrimp" },
              { name: "Ginkgo nut" },
              { name: "Mitsuba" },
              { name: "Soy sauce" },
              { name: "Mirin" }
            ]
          }
        ]
      },
      {
        name: "Otsukuri (Premium Sashimi)",
        dishes: [
          {
            name: "Otoro & Chutoro Selection",
            description: "The finest cuts of bluefin tuna belly, showcasing both fatty and medium-fatty portions.",
            ingredients: [
              { name: "Otoro (fatty tuna belly)" },
              { name: "Chutoro (medium-fatty tuna)" },
              { name: "Fresh wasabi" },
              { name: "Shiso leaf" },
              { name: "Daikon" },
              { name: "Premium soy sauce" }
            ]
          },
          {
            name: "Hirame Usuzukuri",
            description: "Paper-thin sliced flounder with momiji oroshi, ponzu, and edible flowers.",
            ingredients: [
              { name: "Hirame (flounder)" },
              { name: "Momiji oroshi" },
              { name: "Ponzu sauce" },
              { name: "Edible flowers" },
              { name: "Micro shiso" }
            ]
          },
          {
            name: "Hokkaido Uni Trio",
            description: "Three varieties of premium Hokkaido sea urchin, served on ice with gold leaf.",
            ingredients: [
              { name: "Bafun uni" },
              { name: "Murasaki uni" },
              { name: "Aka uni" },
              { name: "Gold leaf" },
              { name: "Fresh wasabi" }
            ]
          },
          {
            name: "Kuruma Ebi",
            description: "Live Japanese tiger prawn, served as sashimi with the head grilled and served alongside.",
            ingredients: [
              { name: "Live kuruma ebi (tiger prawn)" },
              { name: "Wasabi" },
              { name: "Sudachi citrus" },
              { name: "Sea salt" }
            ]
          }
        ]
      },
      {
        name: "Hassun (Seasonal Platter)",
        dishes: [
          {
            name: "Chef's Seasonal Selection",
            description: "An artistic arrangement of seasonal delicacies representing the current season.",
            ingredients: [
              { name: "Seasonal vegetables" },
              { name: "Marinated fish" },
              { name: "Pickled items" },
              { name: "Grilled specialties" },
              { name: "Decorative garnishes" }
            ]
          }
        ]
      },
      {
        name: "Yakimono (Grilled Course)",
        dishes: [
          {
            name: "Nodoguro Shioyake",
            description: "Grilled Japanese blackthroat seaperch with salt, known as the 'king of white fish.'",
            ingredients: [
              { name: "Nodoguro (blackthroat seaperch)" },
              { name: "Sea salt" },
              { name: "Sudachi citrus" },
              { name: "Grated daikon" }
            ]
          },
          {
            name: "A5 Wagyu with Wasabi",
            description: "Premium A5 Miyazaki wagyu, lightly seared and served with fresh wasabi and sea salt.",
            ingredients: [
              { name: "A5 Miyazaki wagyu" },
              { name: "Fresh wasabi" },
              { name: "Fleur de sel" },
              { name: "Wasabi leaves" }
            ]
          }
        ]
      },
      {
        name: "Shokuji (Rice Course)",
        dishes: [
          {
            name: "Ikura Don",
            description: "A generous bowl of glistening salmon roe over steamed rice with nori strips.",
            ingredients: [
              { name: "Premium salmon roe (ikura)" },
              { name: "Japanese short-grain rice" },
              { name: "Nori seaweed" },
              { name: "Shiso leaf" },
              { name: "Wasabi" }
            ]
          },
          {
            name: "Tai Ochazuke",
            description: "Sea bream over rice with dashi poured tableside, garnished with sesame and wasabi.",
            ingredients: [
              { name: "Sea bream (tai)" },
              { name: "Japanese rice" },
              { name: "Dashi broth" },
              { name: "Sesame seeds" },
              { name: "Nori" },
              { name: "Wasabi" },
              { name: "Mitsuba" }
            ]
          }
        ]
      },
      {
        name: "Mizumono (Dessert)",
        dishes: [
          {
            name: "Seasonal Fruit with Champagne Jelly",
            description: "Premium seasonal fruits suspended in delicate champagne gelée.",
            ingredients: [
              { name: "Seasonal fruits" },
              { name: "Champagne" },
              { name: "Gelatin" },
              { name: "Sugar" },
              { name: "Mint sprig" }
            ]
          },
          {
            name: "Hojicha Crème Brûlée",
            description: "Roasted green tea-infused custard with a caramelized sugar crust.",
            ingredients: [
              { name: "Hojicha tea" },
              { name: "Heavy cream" },
              { name: "Egg yolks" },
              { name: "Sugar" },
              { name: "Vanilla" }
            ]
          }
        ]
      }
    ]
  }
];

// Product data for sushi menu experience tickets
export const sushiMenuProductData: MenuTicketProductData[] = [
  {
    title: "Traditional Omakase Experience",
    description: "Surrender to the chef's expertise in this authentic Japanese dining journey featuring premium sashimi, expertly crafted nigiri, and signature rolls. Experience the art of sushi as the itamae curates each course from the finest seasonal ingredients.",
    handle: "traditional-omakase-experience",
    price: {
      usd: 185,
      cad: 245
    },
    estimatedDuration: 150, // 2.5 hours
    maxGuests: 8,
    eventType: "omakase",
    images: [
      "/assets/images/IMG_2697.jpg"
    ],
    availableTickets: 12
  },
  {
    title: "Modern Fusion Sushi Experience",
    description: "Where East meets West in a spectacular display of culinary innovation. This contemporary sushi experience features wagyu beef tartare, truffle-infused rolls, and creative flavor combinations that push the boundaries of traditional sushi.",
    handle: "modern-fusion-sushi-experience",
    price: {
      usd: 165,
      cad: 220
    },
    estimatedDuration: 180, // 3 hours
    maxGuests: 12,
    eventType: "plated_dinner",
    images: [
      "/assets/images/IMG_2695.jpg"
    ],
    availableTickets: 15
  },
  {
    title: "Vegetarian Zen Garden Experience",
    description: "A plant-based journey through Japanese cuisine featuring creative vegetable sushi, artisanal inari, and the freshest seasonal produce. Perfect for vegetarians and those seeking a lighter, mindful dining experience.",
    handle: "vegetarian-zen-garden-experience",
    price: {
      usd: 95,
      cad: 125
    },
    estimatedDuration: 120, // 2 hours
    maxGuests: 16,
    eventType: "cooking_class",
    images: [
      "/assets/images/IMG_2694.jpg"
    ],
    availableTickets: 20
  },
  {
    title: "Premium Sashimi Kaiseki Experience",
    description: "The ultimate sashimi experience for true connoisseurs. This kaiseki-style dinner features the rarest cuts including otoro, Hokkaido uni trio, and A5 wagyu, paired with premium sake selections. An unforgettable journey through Japan's finest offerings.",
    handle: "premium-sashimi-kaiseki-experience",
    price: {
      usd: 295,
      cad: 395
    },
    estimatedDuration: 210, // 3.5 hours
    maxGuests: 6,
    eventType: "omakase",
    images: [
      "/assets/images/IMG_2693.jpg"
    ],
    availableTickets: 8
  }
];

// Helper function to build product data for sushi menu experiences
const buildSushiMenuProductData = ({
  sales_channels,
  sku,
  prices: { usd, cad },
  availableTickets,
  eventType,
  estimatedDuration,
  maxGuests,
}: {
  sales_channels: { id: string }[];
  sku: string;
  prices: {
    usd: number;
    cad: number;
  };
  availableTickets: number;
  eventType: string;
  estimatedDuration: number;
  maxGuests: number;
}) => ({
  options: [
    {
      title: 'Event Type',
      values: [eventType],
    },
    {
      title: 'Max Guests',
      values: [maxGuests.toString()],
    },
  ],
  sales_channels: sales_channels.map(({ id }) => ({
    id,
  })),
  variants: [
    {
      title: `${eventType} Experience`,
      sku: `${sku}-EXPERIENCE`,
      options: {
        'Event Type': eventType,
        'Max Guests': maxGuests.toString(),
      },
      manage_inventory: false,
      prices: [
        {
          amount: cad * 100, // Convert to cents
          currency_code: 'cad',
        },
        {
          amount: usd * 100, // Convert to cents
          currency_code: 'usd',
        },
      ],
    },
  ],
  metadata: {
    event_type: eventType,
    estimated_duration: estimatedDuration,
    max_guests: maxGuests,
    available_tickets: availableTickets,
    is_menu_experience: true,
    cuisine_type: 'sushi',
  },
});

// Function to generate product data for all sushi menu experiences
export const seedSushiMenuProducts = ({
  collections,
  tags,
  sales_channels,
  categories,
  shipping_profile_id,
}: {
  collections: ProductCollectionDTO[];
  tags: ProductTagDTO[];
  categories: { id: string; name: string }[];
  sales_channels: { id: string }[];
  shipping_profile_id: string;
}): CreateProductWorkflowInputDTO[] => {
  return sushiMenuProductData.map((menuProduct) => {
    const sku = menuProduct.handle.toUpperCase().replace(/-/g, '_');
    
    return {
      title: menuProduct.title,
      description: menuProduct.description,
      handle: menuProduct.handle,
      status: ProductStatus.PUBLISHED,
      category_ids: categories.filter(({ name }) => name === 'Chef Experiences').map(({ id }) => id),
      tag_ids: tags.filter((t) => ['Chef Experience', 'Limited Availability', 'Sushi'].includes(t.value)).map((t) => t.id),
      thumbnail: menuProduct.images[0],
      collection_id: collections.find(({ title }) => title === 'Chef Experiences')?.id,
      shipping_profile_id,
      images: menuProduct.images.map(url => ({ url })),
      ...buildSushiMenuProductData({
        sales_channels,
        sku,
        prices: menuProduct.price,
        availableTickets: menuProduct.availableTickets,
        eventType: menuProduct.eventType,
        estimatedDuration: menuProduct.estimatedDuration,
        maxGuests: menuProduct.maxGuests,
      }),
    };
  });
};

// Menu image mapping
const menuImageMap: Record<string, string> = {
  "Traditional Omakase Experience": "/assets/images/IMG_2697.jpg",
  "Modern Fusion Sushi": "/assets/images/IMG_2695.jpg",
  "Vegetarian Zen Garden": "/assets/images/IMG_2694.jpg",
  "Premium Sashimi Kaiseki": "/assets/images/IMG_2693.jpg",
};

// Function to create sushi menu entities in the database
export const seedSushiMenuEntities = async (menuModuleService: any): Promise<{ id: string; name: string }[]> => {
  const createdMenus: { id: string; name: string }[] = [];

  for (const menuDefinition of sushiMenuDefinitions) {
    try {
      // Get the image URL for this menu
      const menuImageUrl = menuImageMap[menuDefinition.name] || null;

      // Create the menu first
      const [createdMenu] = await menuModuleService.createMenus([{
        name: menuDefinition.name,
        thumbnail: menuImageUrl,
      }]);

      console.log(`Created sushi menu: ${menuDefinition.name}`);

      // Add menu image if available
      if (menuImageUrl) {
        await menuModuleService.replaceMenuImages(createdMenu.id, [menuImageUrl], {
          thumbnail: menuImageUrl,
        });
        console.log(`  Added image to menu: ${menuDefinition.name}`);
      }

      // Create courses for this menu
      for (const courseDefinition of menuDefinition.courses) {
        const [createdCourse] = await menuModuleService.createCourses([{
          name: courseDefinition.name,
          menu_id: createdMenu.id,
        }]);

        console.log(`  Created course: ${courseDefinition.name}`);

        // Create dishes for this course
        for (const dishDefinition of courseDefinition.dishes) {
          const [createdDish] = await menuModuleService.createDishes([{
            name: dishDefinition.name,
            description: dishDefinition.description || null,
            course_id: createdCourse.id,
          }]);

          console.log(`    Created dish: ${dishDefinition.name}`);

          // Create ingredients for this dish
          const ingredientData = dishDefinition.ingredients.map(ingredientDefinition => ({
            name: ingredientDefinition.name,
            optional: ingredientDefinition.optional || false,
            dish_id: createdDish.id,
          }));
          
          if (ingredientData.length > 0) {
            await menuModuleService.createIngredients(ingredientData);
            console.log(`      Created ${ingredientData.length} ingredients for ${dishDefinition.name}`);
          }
        }
      }

      createdMenus.push({
        id: createdMenu.id,
        name: createdMenu.name,
      });

    } catch (error) {
      console.error(`Error creating sushi menu ${menuDefinition.name}:`, error);
    }
  }

  return createdMenus;
};

// Default export function for Medusa CLI execution
export default async function seedSushiMenuData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    logger.info('Starting sushi menu seeding...');
    
    // Get the menu module service
    const menuModuleService = container.resolve("menuModuleService");
    
    // Seed the sushi menu entities
    const createdMenus = await seedSushiMenuEntities(menuModuleService);
    
    logger.info(`Successfully created ${createdMenus.length} sushi menus:`);
    createdMenus.forEach(menu => {
      logger.info(`- ${menu.name} (ID: ${menu.id})`);
    });
    
    logger.info('Sushi menu seeding completed successfully!');
    
  } catch (error) {
    logger.error(`Error seeding sushi menu data: ${error}`);
    throw error;
  }
}

