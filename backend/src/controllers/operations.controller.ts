import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

/**
 * GET /api/operations/locations
 * Get all warehouse/operational locations
 */
export const getLocations = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        inventory: true,
      },
    });

    res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Get locations error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
    });
  }
};

/**
 * POST /api/operations/locations
 * Create a new location
 */
export const createLocation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
      return;
    }

    const existingLocation = await prisma.location.findUnique({
      where: {
        code,
      },
    });

    if (existingLocation) {
      res.status(409).json({
        success: false,
        message: "Location code already exists",
      });
      return;
    }

    const location = await prisma.location.create({
      data: {
        name,
        code,
      },
    });

    res.status(201).json({
      success: true,
      message: "Location created successfully",
      data: location,
    });
  } catch (error) {
    console.error("Create location error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create location",
    });
  }
};

/**
 * GET /api/operations/inventory
 * Get inventory with product and location information
 */
export const getInventory = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const inventory = await prisma.inventory.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        product: true,
        location: true,
      },
    });

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};

/**
 * POST /api/operations/inventory
 * Create inventory record
 */
export const createInventory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      productId,
      locationId,
      batchNumber,
      physicalQuantity,
      reservedQuantity,
    } = req.body;

    if (
      !productId ||
      !locationId ||
      !batchNumber ||
      physicalQuantity === undefined
    ) {
      res.status(400).json({
        success: false,
        message:
          "productId, locationId, batchNumber and physicalQuantity are required",
      });
      return;
    }

    if (physicalQuantity < 0 || (reservedQuantity ?? 0) < 0) {
      res.status(400).json({
        success: false,
        message: "Quantities cannot be negative",
      });
      return;
    }

    if ((reservedQuantity ?? 0) > physicalQuantity) {
      res.status(400).json({
        success: false,
        message: "Reserved quantity cannot exceed physical quantity",
      });
      return;
    }

    const product = await prisma.product.findUnique({
      where: {
        id: Number(productId),
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const location = await prisma.location.findUnique({
      where: {
        id: Number(locationId),
      },
    });

    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    const existingInventory = await prisma.inventory.findUnique({
      where: {
        productId_locationId_batchNumber: {
          productId: Number(productId),
          locationId: Number(locationId),
          batchNumber,
        },
      },
    });

    if (existingInventory) {
      res.status(409).json({
        success: false,
        message: "Inventory record already exists for this product, location and batch",
      });
      return;
    }

    const inventory = await prisma.inventory.create({
      data: {
        productId: Number(productId),
        locationId: Number(locationId),
        batchNumber,
        physicalQuantity: Number(physicalQuantity),
        reservedQuantity: Number(reservedQuantity ?? 0),
      },
      include: {
        product: true,
        location: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create inventory",
    });
  }
};

/**
 * GET /api/operations/products
 * Product lookup for Operations inventory management
 */
export const getOperationsProducts = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        unitPrice: true,
        currentStock: true,
        minimumStock: true,
        warehouseLocation: true,
      },
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get operations products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

/**
 * POST /api/operations/products
 * Create a product for Operations inventory management
 */
export const createOperationsProduct = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      sku,
      category,
      unitPrice,
      currentStock,
      minimumStock,
      warehouseLocation,
    } = req.body;

    if (
      !name ||
      !sku ||
      !category ||
      unitPrice === undefined ||
      minimumStock === undefined ||
      !warehouseLocation
    ) {
      res.status(400).json({
        success: false,
        message:
          "name, sku, category, unitPrice, minimumStock and warehouseLocation are required",
      });
      return;
    }

    if (
      Number(unitPrice) < 0 ||
      Number(minimumStock) < 0 ||
      Number(currentStock ?? 0) < 0
    ) {
      res.status(400).json({
        success: false,
        message: "Price and stock quantities cannot be negative",
      });
      return;
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        sku: String(sku).trim(),
      },
    });

    if (existingProduct) {
      res.status(409).json({
        success: false,
        message: "A product with this SKU already exists",
      });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        sku: String(sku).trim(),
        category: String(category).trim(),
        unitPrice: Number(unitPrice),
        currentStock: Number(currentStock ?? 0),
        minimumStock: Number(minimumStock),
        warehouseLocation: String(warehouseLocation).trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create operations product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};
/**
 * GET /api/operations/customers
 * Customer lookup for Operations order management
 */
export const getOperationsCustomers = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        customerName: "asc",
      },
      select: {
        id: true,
        customerName: true,
        mobile: true,
        email: true,
        businessName: true,
        gstNumber: true,
        customerType: true,
        status: true,
      },
    });

    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Get operations customers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
};
