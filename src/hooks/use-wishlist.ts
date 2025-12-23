import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { selectUserProfile } from '@/store/selectors/userSelectors'
import { supabase } from '@/supabaseClient'
import { useToast } from './use-toast'
import { ProductDetails } from '@/components/pharmacy/types/product.types'

export interface WishlistItem {
  id: string
  user_id: string
  product_id: string
  size_id?: string
  created_at: string
  product?: ProductDetails
}

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const userProfile = useSelector(selectUserProfile)
  const { toast } = useToast()

  // Fetch wishlist items
  const fetchWishlist = async () => {
    if (!userProfile?.id) {
      setLoading(false)
      return
    }

    try {
      // First, fetch wishlist items
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist')
        .select('id, user_id, product_id, size_id, created_at')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })

      if (wishlistError) throw wishlistError

      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([])
        setLoading(false)
        return
      }

      // Get unique product IDs
      const productIds = [...new Set(wishlistData.map(item => item.product_id))]

      // Fetch products with their sizes
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          base_price,
          category,
          subcategory,
          image_url,
          images,
          sku,
          current_stock,
          sizes:product_sizes (
            id,
            size_value,
            size_unit,
            price,
            stock,
            image,
            images
          )
        `)
        .in('id', productIds)

      if (productsError) throw productsError

      // Create a map of products by ID
      const productsMap = new Map(productsData?.map(p => [p.id, p]) || [])

      // Combine wishlist items with product data
      const itemsWithProducts = wishlistData.map(item => ({
        ...item,
        product: productsMap.get(item.product_id) || null
      }))

      setWishlistItems(itemsWithProducts)
    } catch (error) {
      console.error('Error fetching wishlist:', error)
      toast({
        title: 'Error',
        description: 'Failed to load wishlist',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Add item to wishlist
  const addToWishlist = async (product: ProductDetails, sizeId?: string) => {
    if (!userProfile?.id) {
      toast({
        title: 'Login Required',
        description: 'Please login to add items to wishlist',
        variant: 'destructive'
      })
      return false
    }

    try {
      const { data, error } = await supabase
        .from('wishlist')
        .insert({
          user_id: userProfile.id,
          product_id: product.id,
          size_id: sizeId
        })
        .select()

      if (error) throw error

      // Add to local state
      const newItem: WishlistItem = {
        id: data[0].id,
        user_id: userProfile.id,
        product_id: product.id,
        size_id: sizeId,
        created_at: data[0].created_at,
        product: product
      }

      setWishlistItems(prev => [newItem, ...prev])

      toast({
        title: '❤️ Added to Wishlist',
        description: `${product.name} has been added to your wishlist`,
      })

      return true
    } catch (error: any) {
      console.error('Error adding to wishlist:', error)
      
      if (error.code === '23505') {
        toast({
          title: 'Already in Wishlist',
          description: 'This item is already in your wishlist',
          variant: 'default'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add to wishlist',
          variant: 'destructive'
        })
      }
      return false
    }
  }

  // Remove item from wishlist
  const removeFromWishlist = async (productId: string, sizeId?: string) => {
    if (!userProfile?.id) return false

    try {
      let query = supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userProfile.id)
        .eq('product_id', productId)

      if (sizeId) {
        query = query.eq('size_id', sizeId)
      } else {
        query = query.is('size_id', null)
      }

      const { error } = await query

      if (error) throw error

      // Remove from local state
      setWishlistItems(prev => 
        prev.filter(item => 
          !(item.product_id === productId && 
            (sizeId ? item.size_id === sizeId : !item.size_id))
        )
      )

      toast({
        title: 'Removed from Wishlist',
        description: 'Item has been removed from your wishlist',
      })

      return true
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove from wishlist',
        variant: 'destructive'
      })
      return false
    }
  }

  // Check if item is in wishlist
  const isInWishlist = (productId: string, sizeId?: string) => {
    return wishlistItems.some(item => 
      item.product_id === productId && 
      (sizeId ? item.size_id === sizeId : !item.size_id)
    )
  }

  // Toggle wishlist status
  const toggleWishlist = async (product: ProductDetails, sizeId?: string) => {
    if (isInWishlist(product.id, sizeId)) {
      return await removeFromWishlist(product.id, sizeId)
    } else {
      return await addToWishlist(product, sizeId)
    }
  }

  useEffect(() => {
    fetchWishlist()
  }, [userProfile?.id])

  return {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    refetch: fetchWishlist
  }
}