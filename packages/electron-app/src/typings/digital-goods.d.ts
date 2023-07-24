type DigitalGood = {
  id: number;
  name: string;
  price: number;
  image?: string | null;
  description?: string | null;
  category?: string | null;
  partnerGoodId?: number | null;
};

export { DigitalGood };
