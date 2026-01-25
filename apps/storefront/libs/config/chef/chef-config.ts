/**
 * Chef Configuration
 *
 * This file contains all chef-specific information that can be easily customized
 * for different chefs. Update these values to personalize the storefront.
 */

export interface ChefConfig {
  // Basic Information
  name: string;
  displayName: string; // e.g., "Chef [Name]"
  tagline: string;

  // Biography
  bio: {
    short: string; // 1-2 sentences
    long: string[]; // Array of paragraphs
    subtitle: string; // e.g., "Culinary Artistry"
  };

  // Experience & Credentials
  credentials: {
    yearsExperience: string;
    specialization: string;
    highlights: string[]; // Badge items like "Michelin Trained", "Local Sourcing"
  };

  // Hero Section
  hero: {
    tagline: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
  };

  // Meta & SEO
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

/**
 * Default Configuration
 *
 * This provides a generic template that can be used as-is for demos
 * or customized for specific chefs.
 */
export const chefConfig: ChefConfig = {
  // Basic Information
  name: 'SDOA',
  displayName: 'Sushi Delivery of Austin',
  tagline: 'Premium Sushi Experiences',

  // Biography
  bio: {
    short:
      "Austin's premier sushi experience — from artisanal bento boxes for pickup to intimate omakase dinners in your home.",
    long: [
      'Sushi Delivery of Austin brings the art of Japanese cuisine directly to you. Our master chefs craft exceptional sushi experiences, combining traditional techniques with premium ingredients sourced from the finest suppliers.',
      "Whether you're looking for a quick, high-quality bento box for lunch or an unforgettable omakase dinner for a special occasion, we deliver authentic Japanese culinary artistry to your door or prepare it in your home.",
      "Every dish is prepared with meticulous attention to detail, honoring the centuries-old traditions of Japanese cuisine while embracing modern culinary innovation. Experience Austin's finest sushi, crafted with passion and precision.",
    ],
    subtitle: 'Authentic Japanese Cuisine',
  },

  // Experience & Credentials
  credentials: {
    yearsExperience: '10+ years',
    specialization: 'Traditional and contemporary Japanese cuisine',
    highlights: ['Omakase Specialist', 'Premium Fish Selection', 'Authentic Techniques'],
  },

  // Hero Section
  hero: {
    tagline: 'PREMIUM SUSHI EXPERIENCES',
    description:
      "From artisanal bento boxes to intimate omakase dinners — experience Austin's finest sushi, crafted with passion.",
    imageUrl: '/assets/images/sushi-hero.jpg', // TODO: Replace with actual sushi hero image
    imageAlt: 'Chef preparing fresh sushi',
  },

  // Meta & SEO
  seo: {
    title: 'Sushi Delivery of Austin - Premium Sushi & Omakase Experiences',
    description:
      "Austin's premier sushi experience. Order artisanal bento boxes for pickup or book a private omakase dinner.",
    keywords: [
      'sushi austin',
      'omakase austin',
      'bento box austin',
      'private sushi chef',
      'japanese catering austin',
      'sushi delivery austin',
      'sushi pickup austin',
      'private omakase austin',
    ],
  },
};

/**
 * Helper function to get chef configuration
 * This allows for future extensibility (e.g., environment-based configs)
 */
export function getChefConfig(): ChefConfig {
  return chefConfig;
}
