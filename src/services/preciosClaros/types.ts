export interface PreciosClarosSucursal {
  id: string
  banderaDescripcion: string
  comercioRazonSocial: string
  sucursalNombre: string
  lat: string
  lng: string
  provincia: string
}

export interface PreciosClarosProductoResumen {
  id: string
  nombre: string
  marca: string
  presentacion: string
  precioMin: number
  precioMax: number
  cantSucursalesDisponible: number
}

export interface PreciosClarosPreciosProducto {
  precioLista: number
  promo1?: {
    precio: number | string
    descripcion?: string
  }
  promo2?: {
    precio: number | string
    descripcion?: string
  }
}

export interface PreciosClarosSucursalConProducto {
  id: string
  comercioId: number | string
  banderaId: number | string
  banderaDescripcion?: string
  sucursalNombre?: string
  comercioRazonSocial?: string
  message?: string
  preciosProducto?: PreciosClarosPreciosProducto
}

export interface PreciosClarosProductoDetalle {
  id: string
  nombre: string
  marca: string
  presentacion: string
  precioMin: number
  precioMax: number
}

export interface PreciosClarosAgrupable {
  id: string
  precioMin: number
  precioMax: number
  cantSucursalesDisponible: number
}

export interface PreciosClarosSearchResponse {
  status: number
  productos: PreciosClarosProductoResumen[]
  agrupables?: PreciosClarosAgrupable[]
  total: number
}

export interface PreciosClarosProductoResponse {
  status: number
  producto: PreciosClarosProductoDetalle
  sucursales: PreciosClarosSucursalConProducto[]
}

export interface PreciosClarosSucursalesResponse {
  status: number
  sucursales: PreciosClarosSucursal[]
  total: number
}
