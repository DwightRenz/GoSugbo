package com.example.GoSugbo.repository;

import com.example.GoSugbo.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Integer> {
    Page<Product> findByStoreIdAndActiveTrue(Integer storeId, Pageable pageable);
    Page<Product> findByStoreId(Integer storeId, Pageable pageable);
    boolean existsByStoreIdAndNameIgnoreCase(Integer storeId, String name);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Product p
               SET p.stock = p.stock - :qty
             WHERE p.productId = :productId
               AND p.stock >= :qty
            """)
    int decrementStock(@Param("productId") Integer productId, @Param("qty") int qty);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Product p SET p.stock = p.stock + :qty WHERE p.productId = :productId")
    int incrementStock(@Param("productId") Integer productId, @Param("qty") int qty);
}