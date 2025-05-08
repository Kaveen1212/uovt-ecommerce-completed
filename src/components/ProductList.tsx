import { wixClientServer } from "@/lib/wixClientServer";
import { products } from "@wix/stores";
import Image from "next/image";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import Pagination from "./Pagination";

const PRODUCT_PER_PAGE = 8;

const ProductList = async ({
  categoryId,
  limit,
  searchParams = {}, // Default to empty object if searchParams is undefined
}: {
  categoryId: string;
  limit?: number;
  searchParams?: any;
}) => {
  // Check if categoryId is defined and valid
  if (!categoryId) {
    console.error("Error: categoryId is undefined or invalid.");
    return <div className="mt-12">No products available at this time.</div>;
  }

  const wixClient = await wixClientServer();

  // Build the product query with necessary filters and pagination
  let productQuery = wixClient.products
    .queryProducts()
    .eq("collectionIds", categoryId) // Primary filter by collection ID
    .limit(limit || PRODUCT_PER_PAGE)
    .skip(
      searchParams.page
        ? parseInt(searchParams.page) * (limit || PRODUCT_PER_PAGE)
        : 0
    );

  // Apply optional filters based on searchParams

  if (searchParams.name) {
    productQuery = productQuery.startsWith("name", searchParams.name);
  }

  if (searchParams.type) {
    productQuery = productQuery.hasSome("productType", [searchParams.type]);
  } else {
    productQuery = productQuery.hasSome("productType", ["physical", "digital"]);
  }

  if (typeof searchParams.min === "number") {
    productQuery = productQuery.gt("priceData.price", searchParams.min);
  } else {
    productQuery = productQuery.gt("priceData.price", 0);
  }

  if (typeof searchParams.max === "number") {
    productQuery = productQuery.lt("priceData.price", searchParams.max);
  } else {
    productQuery = productQuery.lt("priceData.price", 999999);
  }

  if (searchParams.sort) {
    const [sortType, sortBy] = searchParams.sort.split(" ");
    if (sortType === "asc") {
      productQuery = productQuery.ascending(sortBy);
    } else if (sortType === "desc") {
      productQuery = productQuery.descending(sortBy);
    }
  }

  // Fetch the products and handle any potential errors
  let res;
  try {
    res = await productQuery.find();
  } catch (error) {
    console.error("Error fetching products:", error);
    return null; // Optionally handle this in your UI
  }

  return (
    <div className="mt-12 flex gap-x-8 gap-y-16 flex-wrap">
      {res.items.map((product: products.Product) => (
        <Link
          href={"/" + product.slug}
          className="w-full flex flex-col gap-4 sm:w-[45%] lg:w-[22%]"
          key={product._id}
        >
          <div className="relative w-full h-80">
            <Image
              src={product.media?.mainMedia?.image?.url || "/product.png"}
              alt={product.name || "Product Image"}
              fill
              sizes="25vw"
              className="absolute object-cover rounded-md z-10 hover:opacity-0 transition-opacity ease duration-500"
            />
            {product.media?.items && product.media.items[1] && (
              <Image
                src={product.media.items[1].image?.url || "/product.png"}
                alt={product.name || "Product Image"}
                fill
                sizes="25vw"
                className="absolute object-cover rounded-md"
              />
            )}
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{product.name}</span>
            <span className="font-semibold">LKR{product.price?.price}</span>
          </div>
          {product.additionalInfoSections && (
            <div
              className="text-sm text-gray-500"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  product.additionalInfoSections.find(
                    (section: any) => section.title === "shortDesc"
                  )?.description || ""
                ),
              }}
            ></div>
          )}
          <button className="rounded-2xl ring-1 ring-lama text-lama w-max py-2 px-4 text-xs hover:bg-lama hover:text-white">
            Add to Cart
          </button>
        </Link>
      ))}
      {/* {(searchParams.cat || searchParams.name) && (
        <Pagination
          currentPage={res.currentPage || 0}
          hasPrev={res.hasPrev } // Use fallback to ensure boolean type
          hasNext={res.hasNext} // Use fallback to ensure boolean type
        />
      )} */}
    </div>
  );
};

export default ProductList;
