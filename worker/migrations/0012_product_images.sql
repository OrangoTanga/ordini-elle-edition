-- Migration 0008: Product images from ellyedition.com

PRAGMA foreign_keys = OFF;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg' WHERE id = 1;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/passerina.jpg' WHERE id = 2;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/chardonnay.jpg' WHERE id = 3;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg' WHERE id = 4;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg' WHERE id = 5;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg' WHERE id = 6;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg' WHERE id = 7;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg' WHERE id = 8;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg' WHERE id = 9;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg' WHERE id = 10;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Pecorino.jpg' WHERE id = 11;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/falanghina.jpg' WHERE id = 12;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg' WHERE id = 13;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/merlot.jpg' WHERE id = 14;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg' WHERE id = 15;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg' WHERE id = 16;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg' WHERE id = 17;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Cesanese.jpg' WHERE id = 18;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/merlot.jpg' WHERE id = 19;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Ipa.jpg' WHERE id = 20;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Belgian-ale.jpg' WHERE id = 21;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Golden-ale.jpg' WHERE id = 22;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/prosecco.jpg' WHERE id = 23;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/cuvee-millesimato.jpg' WHERE id = 24;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/cuvee-prestige-ok.jpg' WHERE id = 25;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/limoncello.jpg' WHERE id = 26;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Vodka.jpg' WHERE id = 27;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Gin-Old.jpg' WHERE id = 28;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg' WHERE id = 29;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg' WHERE id = 30;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Amaro-Old.jpg' WHERE id = 31;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/Gin-Bottiglia.jpg' WHERE id = 32;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/rum.jpg' WHERE id = 33;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/grappabottiglia.jpg' WHERE id = 34;
UPDATE products SET image_path = 'https://www.ellyedition.com/wp-content/uploads/2026/05/amaro-bottiglia.jpg' WHERE id = 35;
PRAGMA foreign_keys = ON;

-- End migration 0008