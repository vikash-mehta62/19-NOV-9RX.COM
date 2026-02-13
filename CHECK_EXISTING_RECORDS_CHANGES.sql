-- =====================================================
-- CHECK CHANGES IN EXISTING RECORDS ONLY
-- Run this on LIVE database
-- This will ONLY show changes in records that exist in current DB
-- NOT new records
-- =====================================================

-- IMPORTANT: Replace the IDs in the WHERE IN clause with your current DB IDs
-- Current DB has 1261 orders, 1141 invoices, 841 order_items, 11 group_pricing

-- =====================================================
-- PART 1: ORDERS - Check for changes in existing records
-- =====================================================
-- This query will show ONLY the orders that exist in current DB
-- and have been MODIFIED in live DB

SELECT 
    'ORDERS_MODIFIED' as check_type,
    id,
    order_number,
    status,
    payment_status,
    total_amount,
    discount_amount,
    paid_amount,
    shipping_cost,
    tax_amount,
    void,
    "poApproved",
    "poRejected",
    invoice_created,
    invoice_number,
    updated_at
FROM orders
WHERE id IN (
    '001d0216-216e-490c-bfc4-9487c98a495b', 
    '00320333-82bf-4bbe-8612-cf653597b2d8', 
    '008a96a2-7d22-44ca-a857-89fa403aed53', 
    '00de944b-2079-4cd1-8d8d-2753a2f6d5cd', 
    '012deba1-76c3-4d72-8e5f-2df5f3ba228a', 
    '0154d84e-5a18-490f-8ddb-b126cce1e8cd', 
    

    
    '01aae920-8ddb-4319-a42d-569f07d6ca83', 
    
    '01d22432-9fbb-4283-b567-470d413e43df', 
    '01d9ba1c-2c7a-4ee4-9f36-bfe80dbc7f9a', 
    '06e49f56-a76e-452d-a040-79ea97882b90', 
    

    
    '01de24ff-27ed-4a0b-a1d8-7bff059a8606', 
    
    '02210079-20b5-49dc-acfa-1f51503312e1', 
    '0225ac5f-a983-43a8-a63e-94d1b82e7bac', 
    '023ae812-fdfc-4480-b5b5-dfa441eecdd8', 
    

    
    '0241bae7-44b1-4b12-9737-4aa2ce5f96ae', 
    
    '024caedb-3579-4a06-a90f-c1853f2e3df0', 
    '0266920b-1a3e-4fe6-bf42-9e807c703b9c', 
    '0273eda8-29c4-4e98-8450-de8fe29100ec', 
    

    
    '028a4e71-746d-4382-8c9a-164521e65676', 
    
    '02b46dea-1651-4b31-8d86-55a13643d4aa', 
    '02dba2ce-40b4-4f28-a50e-e67d052276d8', 
    '032d9c40-01e5-4918-be93-0029867eb001', 
    

    
    '034a3caa-bf73-49ab-b6d4-007acf42154e', 
    
    '038d6ca0-e0f2-4f1f-90fc-27c34c7436b4', 
    '03a5c20b-8831-494a-979e-f542f9f13ad9', 
    '0418ff3e-6874-4615-8e96-5aac95a7d40f', 
    

    
    '042ed63f-01ce-438d-b034-363293413d60', 
    
    '043d9db5-5eed-49c0-9f53-815a77e2cca8', 
    '049e2ddd-4da6-4220-abb0-4e89ae33259e', 
    '04d7719d-e9ce-4702-b907-ae367948bad2', 
    

    
    '05057457-e878-4dee-9c5e-b8a6c82700e9', 
    
    '05c895f0-c340-4b63-a253-acea424e8d13', 
    '05dc81a0-d162-4048-b5cb-39d29e190c4e', 
    '062bfa30-555a-4744-8c95-8f20ee2f43f4', 
    

    
    '062d2ddd-b94c-4077-8146-68b9fb24b611', 
    
    '06ed471f-26f0-4bd3-8f2b-b3ba972a5848', 
    '06ffa4f9-6996-4a0e-a54b-7fee595ce20f', 
    '0702d97e-2c0f-4ebb-9c9e-6540a0fbb4e1', 
    

    
    '072f8838-8d33-4ed1-820d-2008449b548d', 
    
    '0b95ca00-9499-43c7-b1b5-4d5ae7b72929', 
    '075ce17f-6718-4ea7-9526-85add357f125', 
    '076eb0b8-e755-44d1-a7da-9a0cc62c7063', 
    

    
    '077d86b4-54c4-4570-aba3-a96d80f56e3e', 
    
    '079c6fc6-935a-4674-9779-69416a07fe36', 
    '07b97984-58dd-4910-8458-684f167781a9', 
    '07dbd13d-e212-49ef-92ac-873f2685651f', 
    

    
    '087d7e76-113f-4c0a-8fea-0a549f61b8e1', 
    
    '08d07155-34bf-4fa7-9e65-b0d94bff7d8b', 
    '08e5261c-4077-42ea-be37-05f33963ebfe', 
    '08e96d06-7820-49af-ac3e-481fc8db09d6', 
    

    
    '0b72ab94-61e4-44fc-af2c-7640d10d5997', 
    
    '0943aec7-47a4-419d-a79a-61ec47ef6370', 
    '0950fed4-2aec-48fd-8198-72638decce05', 
    '09f30470-8f3b-47ff-9341-bd610f036098', 
    

    
    '09f7eb00-c71a-4550-934b-ac768b32e6c3', 
    
    '0b48741b-39b6-4858-8a90-2630a770ba4b', 
    '0bb53d75-038d-4ea8-867b-16aeb48cc847', 
    '0bbbb2cb-48d8-41e2-b6c4-091b24ac924c', 
    

    
    '0bca01d6-b9d9-4abd-93c3-28e808bdd0f1', 
    
    '0bd89d36-8163-4f07-9792-8a26ccb9cbed', 
    '0be00162-7719-4ed4-ad65-798a5d788679', 
    '0cb1022b-127a-4d7b-906c-10e8bbee6fe5', 
    

    
    '0cf8ce22-cbcf-463d-9fd7-70d2048d0a75', 
    
    '0d676f82-2405-43d5-8f47-6d5bf0b33977', 
    '0dcb38d5-7d54-4061-b70f-62f216421229', 
    '0e1e73fd-fc41-431b-a12f-af5cf525d294', 
    

    
    '0ee9556c-46de-40e6-9038-2f958fd1e970', 
    
    '0eeeedda-8c61-43df-8805-c3275f89eb74', 
    '0f3278d5-9145-4145-8394-1e73f889ef68', 
    '0f6ab4a4-0dae-46c9-9d09-ff2d996277f7', 
    

    
    '217dc331-fbc0-45df-abed-f3dd021c6629', 
    
    '0fa73358-0561-4a49-9344-22ab00d2accc', 
    '0fc53490-e712-4e1f-862a-e28c3db14c5c', 
    '1036920a-970c-4c86-8e3e-03e76a2717df', 
    

    
    '1069c17d-b2af-4c59-9e21-93c3998f76bd', 
    
    '1088c3dc-0afe-4a21-aa51-8d1ec94a9f9a', 
    '109df215-5ac2-4a6f-b624-0fc755b73d46', 
    '1166fb28-4aa9-42d9-b8e7-a80b5673b503', 
    

    
    '11b60777-afb7-40ac-9c24-aaec27af0dcd', 
    
    '11c05c64-2f21-4115-8372-7394bbb0f8d3', 
    '11c6fae9-2db8-4cf3-93eb-0f041bab8192', 
    '11d6fecd-5e1b-427e-b1d5-c3c58206035a', 
    

    
    '12163b39-dc13-4ce4-91a6-b0823feae149', 
    
    '1225ee22-c856-483c-952f-b935174ca6f1', 
    '12574f75-d8a4-43d7-aaf8-16cef4682232', 
    '1260c2d4-ba98-4f7f-a209-5635f2adf608', 
    

    
    '1264fc61-dc69-4f4f-aafd-4bfc368d40b4', 
    
    '1278f089-1214-46b5-9a9d-97de9d4067e5', 
    '12feb1b4-d35e-42ba-9b40-fbad640db8e8', 
    '133204c4-0b84-44a9-aa3c-15c18989bd2e', 
    

    
    '1379e45f-2979-4616-ad2c-4652b89108e6', 
    
    '14c46802-53f1-4d56-ac10-04c75ee20cdc', 
    '14c58ca3-2d94-4e0f-bad6-b5bbfa5dc62c', 
    '14cbed65-641b-4877-9bdc-9990581e9e1f', 
    

    
    '155c7171-5493-4dd8-b3ad-ded6c8a29bbf', 
    
    '1585f452-d28f-4c34-a865-d7079f00da32', 
    '15dc024d-a2ee-49f8-9c48-9fb2a8556c52', 
    '15f9c7f7-b5a7-4a2c-aef8-2c9bb66f4dd9', 
    

    
    '160ebd91-e0cf-41f4-854d-4d2a4b62cce3', 
    
    '161e575e-7c5e-4218-ba9b-27c1441afc11', 
    '163764b0-0a01-4c39-8b66-9def7aa9ddf9', 
    '1639a040-9d23-4670-b761-b698180a3423', 
    

    
    '164a799d-9b21-4512-8fa4-436e3860c6f5', 
    
    '16d057e8-6b5f-4348-9293-5d27f0b4dacc', 
    '16d4542a-c324-41ce-aeac-75d95af9e1b8', 
    '1727265e-c1b2-41a4-b114-2e145b1f911f', 
    

    
    '1766bbfb-0750-460e-926b-c9291665bdc0', 
    
    '18007644-ea94-4dd2-8c3b-6ee9cdecb2ac', 
    '1869690e-25fa-4a95-a4ec-8394790aa941', 
    '1884f33d-2c4a-4e9c-ac98-f4498ee5a0ef', 
    

    
    '18c775e6-1845-42c4-9797-ae1199938c92', 
    
    '18d02a3f-b30a-4cec-9ef4-7412bd501f83', 
    '19083c3e-da90-4198-8834-bd575e3f7100', 
    '194a53d1-d84d-4a8a-8ca8-6744552011a8', 
    

    
    '1965e84f-add5-4cd0-8c0b-d8d968c2b4e7', 
    
    '199753bd-008f-405c-a342-6d4aa6b8b57e', 
    '19c8fa5c-3798-4f8a-b664-3eee5f5c6e4c', 
    '1b1d0ecb-bd20-44f6-9359-efb39f882366', 
    

    
    '1b459b8a-6d4e-40f0-91a8-41d9d5b60303', 
    
    '1b7ea80a-e58c-4448-b40a-02ede5aafd20', 
    '1bff5543-ef15-455a-8bbd-4e0f4b73725e', 
    '1c4dcaa0-0f5b-4085-8f44-444fca929af4', 
    

    
    '288ddae7-b3aa-4d9d-8074-c69c19072d37', 
    
    '1c827d2f-e22a-48de-8e39-a5b2c926f183', 
    '1d700074-6f72-44b5-842d-2d985429c7e1', 
    '1db47fbb-0038-45b1-b23c-3676a8bb2d0b', 
    

    
    '1df3b3c3-1159-450a-b1a8-372c3f587243', 
    
    '1e38baa3-22b0-4838-9c56-3940d623f964', 
    '1e3ffc33-74ca-4d33-bd4b-368e484ed04f', 
    '1e51fac6-afe6-44a1-9311-0ea91940c080', 
    

    
    '1ec4b492-4273-47ae-b79d-9f4ed1f4d699', 
    
    '1ed3f9d9-5649-4748-ad97-2896142ee46c', 
    '1f3e0b93-fd9b-4a5d-99e2-a52de183fbcd', 
    '2daf2a29-a81c-429a-beb2-d310e23da4fa', 
    

    
    '1fb7051c-9960-4853-8780-94afe9d05a70', 
    
    '1fec2cb3-87f9-4aa3-a02a-9cf9ca91ddfe', 
    '2078da87-405c-457e-908a-912a2f099305', 
    '20aa2ac9-9f56-447e-825a-10b898efe2b8', 
    

    
    '20ef0820-1219-4738-bb88-dde4cb80c97d', 
    
    '2113def2-b336-45e6-aa66-ccd607db8cf1', 
    '21144ffe-6d79-489e-a231-ebe5d08bc0b3', 
    '2120b07f-7eab-4cba-b3c7-fb3a65fcaa13', 
    

    
    '2138f80f-a556-404a-8729-95697ea1f65d', 
    
    '2140f7e3-0029-453b-aa2f-a14a37e62c42', 
    '214d29bd-8067-419c-9ea0-4e77a8109076', 
    '215a20f8-2b2b-4212-8e53-11cc1b779831', 
    

    
    '21970fc9-f322-41f7-819e-6d7af5addc33', 
    
    '225271b7-3d8a-47c3-85e7-fb49f606f71f', 
    '22817e1e-39f8-4e35-83d4-3a284305f4d1', 
    '233bb1cb-4611-4ff2-bf7f-f8f3186a534e', 
    

    
    '23728694-b197-4693-aed9-db7025fba4ad', 
    
    '321f016d-0721-49f2-ad95-4261f2f5c7f7', 
    '2386c0c9-3f89-4dbd-8f0a-dc0c93cbda49', 
    '23be71dc-437d-4ae5-9e46-af0b6ed38e42', 
    

    
    '243bbd95-1c55-45ac-8f20-0089f4e48116', 
    
    '24423e7d-acaa-4739-bc98-1279f17c21f7', 
    '246972da-0475-486e-96bc-96350c7c8398', 
    '24c11c67-12ff-4c2c-acd6-7d11729e6a7c', 
    

    
    '24c14ec4-95cf-47be-b8ca-fd7c53fd6ab4', 
    
    '251e5afd-4843-4a74-be7b-33179fcee232', 
    '2521cd33-60b2-4eab-9fbd-919031bc3d53', 
    '2545e16c-25c4-402c-a94e-d5b33bd9306d', 
    

    
    '25913a75-0826-4037-9694-0d147e38dc18', 
    
    '25d328f5-8c3b-4c57-89eb-35296c27a9c7', 
    '268a3b30-d399-49c5-b334-214986cfe9d8', 
    '26aa108d-2796-47d0-9ddb-dbc6165a259b', 
    

    
    '2764e53d-8bb9-44ad-af45-18d1e8a67e60', 
    
    '27914a1b-2710-4e61-8a40-7392599ba3aa', 
    '27beab35-a760-4490-87fc-5c6da7726d8c', 
    '27e81a44-1c0d-4c6a-9e0e-281f2f3856cb', 
    

    
    '27f3b455-62af-4c84-8c83-b713515a53ce', 
    
    '3226744b-94d8-4de3-b03d-c26befab8000', 
    '27f7400e-ba37-4288-9a93-0f6ffe59dcda', 
    '28184ff6-6a7f-4c69-833b-d7538aa69bfa', 
    

    
    '284791f8-4de2-41b2-8b8b-ae8e668ee487', 
    
    '284ab287-243d-4735-8654-134edd6b8262', 
    '28743a57-8aa9-4b4c-8584-c4f87d4f79e3', 
    '2894cfe5-4efa-4d66-8b8b-ab82ee405fd5', 
    

    
    '28aed613-5144-44f2-9d83-6b9f069acc0d', 
    
    '28bcb008-5372-4e85-870f-c180152be6bb', 
    '28fe98b4-2d36-4504-af70-b0f99f1cb2a1', 
    '29162ad8-098e-4c10-85ff-6777aa289fb1', 
    

    
    '29190f58-97f5-45f2-9b3a-b57b831549e3', 
    
    '2a4fa91b-8ba4-488e-bcba-bac71f824046', 
    '2a5b720d-5ff2-48fc-9648-a4358669ed39', 
    '2a8d1f8f-dedd-425b-b95f-1fe44fddcde2', 
    

    
    '2b5b1b82-65fd-4895-9449-f85dc2e9f6e1', 
    
    '2b9d9d6e-0b04-44fb-b6fe-1b15b965f9c4', 
    '2cb7c2bd-ce74-4677-ae64-0ba6ab789ef6', 
    '2cdf15e1-b4c1-4b48-a588-f13cb4f0ebf7', 
    

    
    '2d27fc64-19c9-4477-ad31-8bdeb725e883', 
    
    '2d9f69b4-0227-4230-87e8-82df5240a567', 
    '2dc3f1b3-6210-4094-b760-4da8dd956f0e', 
    '2dcb2e4f-233d-400d-a116-759cd21195de', 
    

    
    '2e0b3284-4db9-4830-848e-8923af4fc85f', 
    
    '2e2203f3-09a0-4773-90d7-4d2c058c3525', 
    '2ee4899d-b1b3-452d-bc7c-83fa9e805bd3', 
    '2f1bd41c-2ae6-4be5-874f-7261d9828b1a', 
    

    
    '2f91f2e2-9f8b-49cf-9d9c-642ddee6b596', 
    
    '2fc4ae74-1175-49e7-aac2-af5db6131b88', 
    '2ff5295e-2a7e-43dd-b04e-2d5c7e31aaf2', 
    '34bac396-68f2-4936-81f5-afbb8d6d095a', 
    

    
    '301e2a53-41ab-46b8-9c43-3ee25ef1968d', 
    
    '30203ead-7d73-4a93-ae89-8209e692c0ef', 
    '305df0d7-e304-4e0f-99b8-333d264abcd5', 
    '306cab46-4c1a-4349-9090-4782ccdc6e61', 
    

    
    '3072595f-0714-44e9-8e15-7b3daee0c63f', 
    
    '30ce645d-83b7-4a15-8232-16449f2b508f', 
    '30e465c0-9ce4-494e-82e5-dcafede34644', 
    '31076a0c-4ee3-4a93-951f-beb29bc9db7f', 
    

    
    '311a22c7-60ae-4d08-adfb-c0f727da1568', 
    
    '31cb9f1f-0a25-4ba7-b204-f1dd87c288cd', 
    '32624018-957d-4cf7-96b9-b45d8606af0c', 
    '33a5a4eb-c59d-4f4d-aaf8-0d6b2dea0a29', 
    

    
    '33b82b88-94e1-4242-b921-4cc7338b173f', 
    
    '33c0cd32-df68-44b0-998a-eeaa3e37a9cf', 
    '34801db6-7ae4-4bec-90de-f6a32229fa26', 
    '34e7adb9-1de2-4808-8c57-11975fc4b546', 
    

    
    '351887ef-07e0-42eb-97dc-42a6e1d81efc', 
    
    '352634d5-2bfd-4653-a9a9-23ed342470e6', 
    '352e2beb-0464-49a0-8fcb-2792f52fc985', 
    '354bb650-8280-4b5a-b6d9-b686360a2a70', 
    

    
    '35658dc7-a795-48b6-a001-350914b8f90a', 
    
    '3593fa83-b1ea-4b1b-896c-c0e816c58f1b', 
    '35add643-b960-41f5-b13c-9609e8133bf8', 
    '35d03e0d-3d8d-4159-882e-bb4a6bc9a626', 
    

    
    '3626e3fe-3a9f-4c22-b7fd-3ee63d627c23', 
    
    '363968fb-8a01-4dfc-a34d-31a7d29fc3ee', 
    '36418585-d4c3-482f-8972-541b1ee65ef9', 
    '367cf2c4-7e82-4634-9427-5fe14cfe7bb5', 
    

    
    '36e8814e-cd73-4428-a6d9-9a82a17c25b2', 
    
    '36f858c8-0815-4a1c-9b9d-63cf4a841547', 
    '3726f2c9-cade-48c1-ade9-fc961c713318', 
    '374b5876-a071-4c2c-a9e9-849fd77b0817', 
    

    
    '377e107a-0cb5-4775-b601-880c2b92b5cd', 
    
    '37ac429b-551a-4e0d-8666-f0a0181f9845', 
    '381a28ee-b532-4936-bb5c-ec2c00ab5030', 
    '385329d8-46b0-4434-b622-73c3b311ddd4', 
    

    
    '38eb5058-790f-456d-a223-5c02294fee86', 
    
    '38fba92c-390c-4eb8-91b2-1f6504a7bdfb', 
    '39417fd8-7dd2-420e-984b-8ebe522dab9a', 
    '3953bf52-2035-4402-adaa-1dc5318e0887', 
    

    
    '396aed16-8e18-4d53-8610-c8a6dbebdbd9', 
    
    '396e3c81-eec0-4649-9261-f0fcd96739ac', 
    '39700280-7b9a-4841-bb04-34ab421d5971', 
    '3976942a-00fb-4970-86c6-a8547d675bee', 
    

    
    '39d2d194-61ca-4a36-837d-6adeb0787f95', 
    
    '3a45696b-09f3-45e2-9e7e-0e3c2fea63de', 
    '3a7fca98-89c8-4b83-a1d4-6fdd0b6909bf', 
    '3a87c240-15ed-4ffd-9011-c7e8949c32bb', 
    

    
    '3af8fd1f-c6d7-46a6-8351-fddbf771a007', 
    
    '3b2c782d-2fa7-41ab-9544-a317f1daa829', 
    '3b743f08-b93a-42fb-91d9-f3022fd54b30', 
    '3b859587-17c5-4212-a3aa-dbc44ce37eec', 
    

    
    'a0e5f921-337a-40ce-9e75-5b7b4941bcf0', 
    
    '3b8d80c0-736b-4399-81f3-7cf74b177661', 
    '3bab7418-0375-4d12-bb85-889b05b158fd', 
    '3bac3959-c2ff-4264-afbd-cbd3d711ba5d', 
    

    
    '3c76db28-e706-4e45-b8c9-638ebd8f278b', 
    
    '3c9f70b4-175b-435f-870a-ef5dcd9a0d55', 
    '3cb7bc81-3243-4b06-a466-34b2363463ac', 
    '3d5d5c6a-75a4-418a-a5a7-c14b0c5f589f', 
    

    
    '3d70624c-757f-4b02-bfd7-26097a6a0328', 
    
    '3d97c827-ee84-4464-8c62-d7a80df69294', 
    '3e11fcc8-85ef-4a4c-a76e-910d24efac9a', 
    '3e9ad646-69e1-4e76-a923-596433a8f2fa', 
    

    
    '3ebaca79-ad0c-4eee-b6d7-f0fdbcd5e7f0', 
    
    '3eda604d-cec4-4fb3-b77f-2dbdb2541a62', 
    '3eef7f00-b3e9-47aa-a0f0-9394eaa6ba98', 
    '3f2cc38f-7e0d-4abc-b035-a11c75a673df', 
    

    
    '435b11b7-2017-47ce-8e3c-300e76d2e594', 
    
    '3f3dff64-1b19-42bf-abb0-b445c5d591d5', 
    '3f45bcbc-8cd6-4c74-81fb-d9fbedbdc989', 
    '3f681045-cf94-4f56-8f75-5c108b1341e3', 
    

    
    '3f74c5eb-3eb5-4a01-ac71-c52d2bc848d3', 
    
    '3f7c865d-251c-4893-9e4d-11453b60f849', 
    '43c18383-1119-47e7-9d38-fad1c18c174f', 
    '3f833fc4-d123-4adb-b9e9-fd3892f320ac', 
    

    
    '3f98aa5f-5264-4871-8b57-1e7b00d1b832', 
    
    '3fe9a269-302a-4191-a146-844ccaa8f3cc', 
    '4055b02e-3aca-4ba9-ab09-0fd92834a8fb', 
    '407b101a-4762-4a03-8d26-2356b68f0345', 
    

    
    '40e4daeb-76fb-49b8-9cb6-d6eb3c1f4fa7', 
    
    '40f381d7-e173-43d0-896b-145ffd72af16', 
    '410f2dcf-39e9-44e0-9b73-e15233a02c07', 
    '41345f17-7d79-4be3-bd51-e39c69147b94', 
    

    
    '45f77d78-a5c0-4561-88fc-2aeaca87184c', 
    
    '416ab08d-a35b-4d6c-ba1b-1fd0f1fa74c2', 
    '41755432-5f54-412b-8bb0-fd86c464f7a3', 
    '41af8b21-5837-4e10-9a4a-e91da28b068d', 
    

    
    '423ebf39-e59c-4e3d-83a9-1b7c3a679920', 
    
    '4262c515-7428-4433-a290-730c375e55a9', 
    'b3dce052-f246-40e8-aa8a-42879a503fcf', 
    '42a11489-5fb1-4073-b210-e50ded74df48', 
    

    
    '42b243cc-9442-44be-9205-c438c2d69e72', 
    
    '42b86fda-4cff-4525-9570-cfb2d6694be5', 
    '42e303de-3c30-4287-a1e8-6c735287f371', 
    '4354f008-8f75-4db1-b8fe-1ddee1613492', 
    

    
    '43e9189e-5c16-43d1-90b3-49ce62aeb23f', 
    
    '44068c1f-557c-41f3-96a6-384264dc6560', 
    '442c4a29-9a44-4b01-bec6-5eb31d956832', 
    '4447d3b5-15f2-4002-8f88-4773fa08eec6', 
    

    
    '59accbd7-4f52-4bb8-8d70-54f33a421d27', 
    
    '44bb7915-d5e0-40be-b398-67702c8800d4', 
    '44e38ddd-e097-4def-b193-6373de42a27a', 
    '4540e589-8a14-41f3-b752-e9a707411411', 
    

    
    '4573bd9e-137b-4a5c-9d81-284d452ad325', 
    
    '458d9a82-e844-4342-be8f-d3bb9dbdfa1c', 
    '45b0247e-0a57-40c1-b900-52d8548ede1f', 
    '4621a7f1-0ccb-444a-b2ef-bf6a909c02d1', 
    

    
    '46591859-6c58-4d9a-92d4-c6f3fb22cd32', 
    
    '466a4b51-4719-456a-8482-1c8a13fdabfe', 
    '46844511-9d58-4a7a-8c37-7cb3727bf7be', 
    '46d8b578-40eb-49aa-b22c-f3d8361b3629', 
    

    
    '470c31b2-7173-41c7-ab8e-09872dbdc563', 
    
    '47747bda-9038-4963-92f9-0769a899a962', 
    '479eb268-3f29-42fd-9faf-9c1b43c23ca3', 
    '4852bb5d-4890-41e0-baf4-d216407183c6', 
    

    
    '497ab6c7-d651-40aa-b6c1-363b545741f6', 
    
    '485cb7e9-34da-4402-a111-e1292ca769e4', 
    '486ad368-03df-4c2e-8a13-9e5a1aa87a38', 
    '48852a84-657a-4dc8-92dc-6908b9352ace', 
    

    
    '4930e295-1506-49a8-8561-fc0e7b846630', 
    
    '495720e3-1837-4236-a61a-16ddab6fc599', 
    '49c8164f-14ac-4b8e-aeeb-35d3e150bda0', 
    '49ec91d6-fdc2-45ec-a69d-9b7d668e1df4', 
    

    
    '4a1609d3-4ad6-4073-a790-daae8e961d06', 
    
    '4a40844b-9a03-4ed9-bcf6-c978bac05da0', 
    '4a44ac03-ea38-465a-b103-7b73d2a4a935', 
    '4a8a914c-5e4e-4f1b-a53a-ebca35792744', 
    

    
    '4a9a5b8d-e146-4ca3-ab07-ad5f9fef03ee', 
    
    '4ad205b9-0ca5-4708-bf12-774552c1d049', 
    '4b3aebf5-be0c-4f82-ab54-313a23b6864b', 
    '4b3cf931-5085-4f14-87d8-50edc0bf9fda', 
    

    
    '4ba54607-081f-442d-a33c-45fd267839d1', 
    
    '4bbdd8ea-67bc-40d1-bca4-efc199f88759', 
    '4bcec1a0-af42-42ff-b828-5ad698a75aaf', 
    '4c2b228e-ad47-4085-8999-407d18af8d60', 
    

    
    '4d11c6f1-ad1b-44c1-b137-55c3cd68a67a', 
    
    '4e2a2ae1-68d0-4d63-b480-f333c18ff5ad', 
    '4d8061af-d1c0-4319-acd7-0d839e6d3683', 
    '4d8221ce-c214-4367-b05f-f62a1fffccf0', 
    

    
    '4dc5222c-527a-431c-beeb-fbd37d5835a9', 
    
    '4de41466-71c2-477f-8388-c624632357d7', 
    '4e26caeb-d8d8-40c5-9d7e-39ac77bd9208', 
    '4e3e642a-1eaf-499f-891f-6d21183c57fe', 
    

    
    '4e581065-405f-40c0-9009-368020d42a60', 
    
    '4e58c63e-b00e-42ee-820a-66d2d7403c30', 
    '4e818d30-2864-404c-859b-a105fe22f187', 
    '4eca7938-d1f9-4f2b-b8db-6928bff0f005', 
    

    
    '4ee3065a-5d56-4036-91bf-9f114340e742', 
    
    '4ee6790f-2705-4bd7-99f2-857140a950ab', 
    '4ef9aeeb-18e0-418e-a41b-8cc9de00b03b', 
    '4f26cfec-b193-4c94-a559-43ab2584403f', 
    

    
    '4f4014a9-6d40-43dd-bc96-73032d6b0983', 
    
    '4fac6dc8-fb63-44b6-b86c-dc5614eacb56', 
    '503034f0-d981-434f-a843-c3701fe8924c', 
    '50a28300-39e8-4715-ad98-a2f5e70080a0', 
    

    
    '50b00773-6726-4cb0-9a7b-d17264dc25e5', 
    
    '50b7c157-bccc-4477-966c-05b0b5448b6e', 
    'a53c55bd-e7ac-4881-8e06-d750da383202', 
    '50ecfcc7-6662-4c8c-aa85-6c30bd241d6f', 
    

    
    '50feca7b-63a0-4867-91c7-aff3222e8728', 
    
    '51136987-1b86-454b-9403-38ec51891d8d', 
    '51503ec6-d0f0-4935-8793-906007d6f003', 
    '5155f723-a229-48cc-92e2-7315f4d007ed', 
    

    
    '51921da8-2992-45aa-8343-b551609a121d', 
    
    '51dbe383-f9af-480a-98d4-d0238bd254c2', 
    '52068657-d1d8-48b0-82e6-27ccd6876d82', 
    '526a6c04-96ae-4bf8-86e3-a52c46469b24', 
    

    
    '5284f55b-ac4d-4be5-80e0-8f13ac307432', 
    
    '56b73af0-fc65-41f0-8b05-66289cda3a58', 
    '52a4b9e2-8c13-4407-b593-91aa0ef5e0e6', 
    '52c42444-07fd-4b61-a4ae-1e759a1128a4', 
    

    
    '52ead18f-cf19-43f5-9d33-4fe2c5252b07', 
    
    '533ea538-8663-487d-97bc-161026605cb8', 
    '53484427-e687-4ec5-b605-40f371c0c5f4', 
    '5368b981-6670-47f2-8256-f864c2638f6f', 
    

    
    '539208f0-dc2a-4b87-9cd7-4f85d9fbc428', 
    
    '53d89561-7f5a-41df-8a45-204698dd1886', 
    '5464b9f7-f94d-4ef0-b128-44915edb64d4', 
    '547399ae-2575-43c1-81f8-f88281d491e7', 
    

    
    '54f4e6ad-7340-48a1-9119-a44a0acaf791', 
    
    '55734dc1-2904-49fb-b822-01891c8c22ae', 
    '55f8e9c2-4f65-4d5f-b78c-c507020cd57b', 
    '5604e52d-5d5e-4faf-a9be-b5bf7aa1f7ef', 
    

    
    '56bb42c7-e036-458e-b4bd-21b889a8d60a', 
    
    '5625ef94-3fbe-46ae-b9e8-ac427626caa7', 
    '564c69de-0757-419b-a3fe-d24bcb9c0855', 
    '5651c4f8-1b14-4214-96df-a0e913f7428d', 
    

    
    '565b2fe0-f68b-43e0-9efe-2a60156b5543', 
    
    '5669a10a-a142-45f8-8525-a2c547e3688f', 
    '572d2ed3-4c39-4885-a5b9-29dfd2717d30', 
    '57b8d4f0-433b-4ee3-88de-c55171c7f5f4', 
    

    
    '57e9be83-6edc-4b53-8276-f4072d979b4c', 
    
    '5836bdaa-112f-4d17-ae9b-ea2bd1804d46', 
    '58417343-1504-4875-8d60-326b710f8654', 
    '584c9993-1159-4da9-886c-7532ca520812', 
    

    
    '58bfcf43-a750-446d-87d6-5789bbeeeec8', 
    
    '590143bf-d6ed-470e-ab86-399f0e2f1cf3', 
    '5942aed3-f3c9-4ff5-9fef-303cb3e8f184', 
    '59449c04-4be5-4b28-94e4-89b5556466b0', 
    

    
    '59455c7a-3236-4dd9-9daf-b6f89d7cfc83', 
    
    '594a16de-1793-4fd4-a738-e98b2deafbbc', 
    '5957e790-8b48-492c-872b-6d6837cf7bbe', 
    '59731da2-ecc2-42d8-95ca-a702d759fcdf', 
    

    
    '598f42a5-177f-4cfe-a34b-a76c177c4d07', 
    
    '59c0bf50-857a-4875-9338-886504eaee96', 
    '5a271980-4b9b-4e7c-9900-7caf9a73b17f', 
    '5a45037a-9f66-48ef-b23b-2ccf4de1780a', 
    

    
    '5a8015fc-dca4-4e92-bd43-6e1c2eb745f7', 
    
    '5a90cce6-b7a7-4b69-91b7-36c2fcfd6fda', 
    '5afc46e0-bb32-45c9-8182-e848ab79febf', 
    '5b0d4e35-f7e3-4834-9f48-38a4e0dc47ce', 
    

    
    '5b14ccb1-4573-4781-bafc-5fb2e34d694e', 
    
    '5b28fc32-10c8-4f5f-8bdf-01aaecc35782', 
    '5b2fa54b-ee33-44cb-b7cd-9dbb4a810532', 
    '5c032a26-d9c0-4aa0-bed4-dc49f9399d38', 
    

    
    '5c069338-d6fd-48aa-8a8b-7ae5a025d2e1', 
    
    '5c072642-c570-4a39-9387-bd83ec5afb2e', 
    '5c2bc764-a605-46c6-bf10-8bcdfe108fbe', 
    '5c4bd7af-c529-4d1c-a1fd-b005c6e92718', 
    

    
    'b406f224-9b10-4132-b455-2104cffd6c22', 
    
    '5cb12b34-a3d2-4957-9c7d-e96e4ed8283f', 
    '5ce92684-8b7e-45a3-a763-752cbe5da987', 
    '5ce96986-8326-49a8-9142-7f65e55df1a2', 
    

    
    '5cf38fd5-a8f5-44fe-88a1-96a2f6df9369', 
    
    '5d6dfa79-1bed-431f-884a-fe502d23f36e', 
    '5e11cff7-3cbd-4c62-a9e2-60239643c7b5', 
    '5e6e8723-10cf-4153-896b-9f25c69bee20', 
    

    
    '5e7f4075-dca2-4e90-81a1-b1312e85d923', 
    
    '5eb95202-4364-40ce-a3df-21c539271b05', 
    '5eb9dc98-0eba-4e43-8cba-f76709d7fb47', 
    '5f5a4cb6-28fe-46a0-9885-e61f49804500', 
    

    
    '5fdbd7de-88b3-4639-bccd-bed7a0435186', 
    
    '602d7aee-28e0-4f2f-a523-e7cc433022c1', 
    '60a73038-803f-46b3-ae1a-63e9a3dc4d75', 
    '60d30e6c-855c-47cd-bf68-24fd9ca900a8', 
    

    
    '60dd0c63-d791-48f1-9d7d-55c5c369716f', 
    
    '6137ad8b-c72e-4a56-af1f-0aad4b96ab80', 
    '613bc1f7-2fb2-498b-8a86-ec42027e58a4', 
    '6216f0ab-407e-4791-b862-3e51d5408d17', 
    

    
    '62257e72-4a7d-48d2-bed4-869e46e7edf9', 
    
    '62e19150-752e-4437-bb11-c7474330b46c', 
    '62e2461a-8895-498e-92be-526fa16a9a92', 
    '630a9f7c-cd88-40df-99d5-835da1b99460', 
    

    
    '63304125-be88-4cec-90d0-1252c8eb58e8', 
    
    'a6d1b0c3-261f-4c11-b668-f4bb33f8f955', 
    '636cf307-bcc3-49ec-8870-23dea344a36d', 
    '636e7645-3492-43c9-8ae5-adae4784bdfe', 
    

    
    '639df873-5eee-48f6-b4e6-4d3791d144d9', 
    
    '63ca45ed-b834-4b8a-a43a-cfb648bb9296', 
    'a4d73d1d-c95f-4cf3-b5e9-32afc3da0cd9', 
    '6405d61d-bb86-481c-b20d-2ddb5f8539f0', 
    

    
    '64097d6c-d668-4520-9a95-9640ecf138a9', 
    
    '640c5d01-f4a7-4a27-bcdc-4fae443995fe', 
    '64dff7c4-e0fd-4d35-9552-6b92a6e9479a', 
    '64e03dc6-93b2-479f-9b83-92bdb1a28439', 
    

    
    '6526344a-6ba9-48d9-8cc1-55a452dd8e9f', 
    
    '65304b27-4dcf-4068-85b0-00d4355449b0', 
    '65bfdab6-c520-4e39-9dc4-a89a1a6378a0', 
    '6685b9f9-fc90-4063-8613-1d8b6662581a', 
    

    
    '66cd32ea-1241-452d-a2b6-043d3b8f7701', 
    
    'ba938a5d-cb64-4bd4-8aa4-f7be7325b9b6', 
    '66ea32e8-6eb1-4b58-9ec0-6f2bbfb01843', 
    '670a17ee-b328-4d82-aa81-ca8d7c0c0654', 
    

    
    '672b03a9-f1d1-44a0-81b1-991c307553e4', 
    
    '67422e0b-17ec-4d2d-9c31-5e7c27a260fa', 
    '6756ffcf-590f-4ebe-b5df-c66ffbb0c1be', 
    '675a3d84-ce84-4754-ac87-2dfcf41c0a11', 
    

    
    '677377cc-788c-44e6-abb0-498041ba2b9b', 
    
    '67a7cf13-3e72-40d9-896e-fc1d11e06c4c', 
    '67af6bf2-b06d-43a9-88db-dc90991bf6af', 
    '67ccb2c9-9774-443e-8385-cbb03a72400d', 
    

    
    '682c2e3e-5ded-4fc1-a2c6-4877f2d7d37b', 
    
    '682c80ca-323d-430c-967e-4347b910cf29', 
    '6890d8c9-f514-4350-b303-4b6dcec775ac', 
    '68d2e481-37cc-47a4-a4ad-fa9149f536df', 
    

    
    '68e3e7ef-ea54-4495-b0a0-f7fad3bda24b', 
    
    '69444eab-821b-4bc5-8941-9c1616c5cad5', 
    '69490a69-711d-44a0-a2db-b2ae31ec412c', 
    '6963a32d-037b-4964-adde-9c17e56bcc02', 
    

    
    '69dc74d3-d5e7-45a2-967c-6f6fc4ad5e3f', 
    
    '6a3fbcf4-e0f3-48ad-94ab-838459798a7a', 
    '6a7dce44-349e-4bfa-9869-9b3df07c221b', 
    '6a8dd3d2-6914-4410-b716-0a82458b54bf', 
    

    
    '6aa99b89-1bb3-49d1-b871-50822d714bbf', 
    
    '6aafc318-9a07-4740-a052-4de6236fb0f3', 
    '6ae5a03f-6cea-46d1-b12d-e3c40c10ce19', 
    'baa65e0c-9366-46a8-b6a7-c35cc2e2e3d2', 
    

    
    '6af46791-ec76-4eb6-966b-814eea752f34', 
    
    '6b0385d2-13c2-48b8-ba37-9a6ba54661ad', 
    '6b4504c5-0e7b-40a3-b531-7e4d36223893', 
    '6b802fef-20ba-4f6e-bbde-2b81c708a08c', 
    

    
    '6b8651ca-fcdb-48d8-9d56-b996fa4ea4eb', 
    
    'bab1f9c5-0867-42b1-9577-c4dd1214b333', 
    '6c18a815-31a0-4b02-bdb4-b44a3e88a0c5', 
    '6c63a8e1-ff22-41ef-82c4-52cae2f111ea', 
    

    
    '6c95c16e-0851-4136-a980-99db56e62063', 
    
    '6ce0091c-b8d5-4eb9-bbc5-54d5ca1bb097', 
    '6d4d4255-970c-4b61-9043-c1045c78bc7a', 
    '6ce49ccd-eeff-4a26-9e34-67937d887a84', 
    

    
    '6d04326d-1856-46f0-924d-915e38b09690', 
    
    '6d0ea87f-0ca9-496c-8c52-00b612dc433a', 
    '6d2f989e-740e-4b5b-b10c-1ffc606c6256', 
    '6ed5b1bf-4c9e-4806-b61c-6cd87efdef31', 
    

    
    '6d83937b-b560-4d4d-9b0c-c4fa3bf1a113', 
    
    '6dc2538f-5d7f-48b5-928a-2c20e87f9098', 
    '6e701b33-77b1-4902-9da3-bd76774f14df', 
    '6e71d0b5-8a22-4a74-9c36-6558ad624a55', 
    

    
    '6e8e4de9-f667-497a-88c0-eb114b4fdff6', 
    
    '6f2fd6e8-84ac-4fd5-a61d-89f2f82a157e', 
    '7002b6ac-d463-41ed-9272-285211db10dc', 
    '705ebccf-e226-4b01-a43e-0ad413c721d7', 
    

    
    '709a42bb-654b-4454-b6bc-adfea77f80b8', 
    
    '70cf3bd8-a342-45d9-8be0-71fa3051410a', 
    '70f346df-edb8-43ea-a41d-81f86cc14b4c', 
    '7113ebf1-6599-4630-a964-bba743644d07', 
    

    
    '712b9e04-104d-48f1-9e92-53b492c4f083', 
    
    '713a4579-8f0f-49db-b657-b107a74538d3', 
    '714f7250-99c8-4564-a290-6627eb94d24e', 
    'bbe91bf1-c547-46d9-80ac-f1e0b31c1452', 
    

    
    '718b7526-017f-41b1-a7b6-d7ec9ecca971', 
    
    '71906fc8-4130-4444-920a-2f654a5ad271', 
    '71e27750-02aa-47f2-bb33-810bd00bd2f7', 
    '7222949c-ffa7-4b74-bd15-04cd0534f3d2', 
    

    
    '724494a8-ed80-4a37-8398-cf4d7213883b', 
    
    '725b65a4-938f-43ad-8288-d635207a54d0', 
    '72d94c68-7fb2-4176-8e5b-77ff62f9b331', 
    '73213eae-154a-4327-a512-6535a01a20ea', 
    

    
    '73698cfe-a83f-4ea7-81af-2a61cd3bf72e', 
    
    '7396f1e2-e620-48bb-ac7b-9b6b4bda5847', 
    '739ed21e-7abe-4585-ab8b-75dd75af63db', 
    '73c673c7-ba58-4b3d-8ee6-955d860816f9', 
    

    
    '73f31501-fc29-46c2-b4a1-9b4b7d34b3f6', 
    
    '74049962-39c5-4704-ab26-a04e44c3ba0f', 
    '74c8578a-44f0-40ad-a01a-a9dd4ea8ce1d', 
    '74d2e4e5-1fb1-4e74-827d-def5bbf99fe1', 
    

    
    '74fb517b-5be9-418a-84ea-ebcb4d8fcad9', 
    
    '750ff422-4855-424f-8a2a-c2098c90d659', 
    '75106bb1-1141-432a-a289-50ba6c657df4', 
    '75175081-671c-4201-bc59-fc987671a56e', 
    

    
    '7566b12d-ba59-452e-a8e4-1ebd5d242429', 
    
    '759368f2-e286-4ea3-b7c8-8c4eb7f15350', 
    '759bf263-fd72-471b-8b00-f8aea5a5ca2e', 
    '75eb8dfb-31af-4a16-8841-c79b438733f2', 
    

    
    '764b885b-9a2b-44ec-988f-3abc155a0a8d', 
    
    '766f64c3-1448-45dc-811c-0387f215b557', 
    '7706ed85-8c34-4420-9fd3-11366d0ffcb6', 
    '77866884-8306-43ad-9279-378c4cbdbe98', 
    

    
    '77e866bb-5542-4044-b76d-421c0c06ed59', 
    
    '77eea7bc-b404-4617-8e9a-aa19fd539330', 
    '78084d33-cab8-433a-88e5-338a5253ca92', 
    '78a1185d-2bdf-4dd3-8b17-66c485a96e9a', 
    

    
    '78e8cec0-668f-438d-a905-1a71c8f47ecd', 
    
    '794bded1-214d-4565-ad60-65685f9aea83', 
    '79858974-bc02-4983-a5cb-8ed0beab03e9', 
    'bcc1456a-4cd9-4186-b700-41006e4353db', 
    

    
    '799c19ef-7aaf-41ae-8a54-ba85e5e19856', 
    
    '79a59f46-085e-4c77-ba79-5c943d900769', 
    '79a7e6f6-1d4c-49f3-91e7-ae3f93716b7a', 
    '79bdb264-514f-413f-b10c-c7ae6f5ff360', 
    

    
    '79c9c415-f2d7-4a28-bdc0-e51d3ec3d636', 
    
    '7a1c0090-a435-4d8e-8697-63febc10aedf', 
    '7a5e3f84-9b94-4473-bc9f-84fecbc595b0', 
    '7a676ff2-4d9d-4669-a32e-f3311f2130ce', 
    

    
    '7ac4dd27-d16b-4fa8-8b69-a47d4ef8daaa', 
    
    '7acd38a7-00ee-416f-8c15-cc57244cb705', 
    '7af04493-1a6a-4405-8b0f-d2d1b6abb685', 
    '7afe099f-4916-4fa4-a7fb-7fb6a4705950', 
    

    
    '7b264905-534c-4684-bc0c-19c12d3f1de0', 
    
    '7b42e278-2f76-48c3-accc-cc8ad45fa194', 
    '7bf5b610-5a12-4b2a-831d-5da9ad7e23c6', 
    '7ca1a3a9-d3c3-4d18-9906-832e90f5f810', 
    

    
    '7bf6a0d4-2da6-40e6-9931-6f8ad68bc17a', 
    
    '7c0f4faa-4305-4b7c-a5d7-3d1551206934', 
    '7c145b90-391f-4aea-96e5-23a9f774b896', 
    '7c5a220e-6387-4378-930a-0f86e8d773d1', 
    

    
    '80129ce3-9e22-4770-aabc-0d8a2cde01cd', 
    
    '7cb60406-d030-4266-bd0c-221024df5abd', 
    '7cef57d9-f976-465b-97cc-e771a0eea2b6', 
    '7cf0baca-17e4-4085-a936-4dec843f57cc', 
    

    
    '7cf13016-4f1d-4bf8-8f51-7404161f83a4', 
    
    '7d2207f0-b8d4-4f05-b57f-1e6bd1d1aa80', 
    'bcdda6a7-81cb-4048-9814-ec5afc171d40', 
    '7d42d75b-3ed2-4730-9382-0f241938de48', 
    

    
    '7d9902a1-06be-4a6f-9861-69e5b94b4222', 
    
    '7dc3cdb8-42ab-4667-8a4c-36b77edb2533', 
    '7dfa105f-7d80-4dcd-b5a8-97757f001ab9', 
    '7e8b7dc8-e7ea-473e-be45-9ee09b9c33cf', 
    

    
    '7eaf0677-ddb2-430c-ac8e-cc6d4931c895', 
    
    '7eb3e116-54ef-48e2-bcd8-a5350896ca7b', 
    '7f9dd3fa-16ef-4b3f-8881-b9495a32c9c1', 
    '7fbe554b-f944-44a0-a894-ce844c7747c6', 
    

    
    '7fcff9d4-53ed-477f-b13d-f18bcb54eafd', 
    
    '8008bc4e-1a79-4e2c-8d55-ac1409e57261', 
    '801bc59f-b95d-4b08-a89a-6215891222f8', 
    '8069d6f9-96ba-4c71-a3e5-93f4974c705a', 
    

    
    '806fc1fe-4db7-435c-890e-8dc1cddb4aae', 
    
    '80aae3d8-20b4-409a-9728-dd5804e408ac', 
    '80f1c502-25ee-4f76-b0d3-6b878b8b4488', 
    'dfd03ed3-6618-4527-97f5-cd3f61689624', 
    

    
    '814a9559-fd3b-4d92-afcc-ef0005234ecc', 
    
    '81b6306d-0483-4593-84ac-834df862806a', 
    '81f52ebc-437e-45a1-ad25-04326e99b5d2', 
    '820eff17-d942-46d6-a979-69adf568adbc', 
    

    
    '823c025d-326f-49b1-be3a-07851d399aa5', 
    
    '82ed6e16-3481-4ae4-9842-d8dfe5192159', 
    '830414a3-0a7d-43c8-8e37-4dec44a139b8', 
    '832a4d5d-404e-4ee7-8979-421d68f7ba66', 
    

    
    '8336e479-fa1f-42fa-8e5f-08e0ea86a2b0', 
    
    '8351e312-6805-469f-ac41-a6cfdc821402', 
    '83d2bb9b-700f-447c-ad63-6d5a31c44ce3', 
    '83ed4ce9-86a9-4605-ae6f-370e0e0d78a4', 
    

    
    '8415f4e0-caca-4acd-894d-43b0fac47917', 
    
    '8418d332-99db-44b4-adf2-6d7e1b81a938', 
    '84278f8a-d489-410c-b3d8-dc4d053567ba', 
    '84553753-a8d6-4e39-ba6a-03791726e0ae', 
    

    
    '88c2b4e4-636e-4eb9-b363-ccfef12002ef', 
    
    '8490af17-7f41-4026-87b7-1a2b7d449d71', 
    '8498bba0-f834-4266-8cc1-7804e53dd226', 
    '84ac4ee6-2b49-4b20-8dd2-3a52039edd43', 
    

    
    '84d12c1a-d384-4a48-af2d-a5c995d21286', 
    
    '851b7866-b444-4a54-9f0e-7f513fe736b3', 
    '857d7d9f-5d63-4b93-a1cd-00665b5112e0', 
    '86003368-7a94-464f-b6dd-5eb68cf50752', 
    

    
    '86495709-0e58-467a-baae-1ea5447c2634', 
    
    '86cba6c4-69ec-4b50-81ba-3d86999d68be', 
    '86d17c53-eba3-433c-a26d-a51a8757eee2', 
    'e3da6059-41ce-4e18-ae04-83c5f7990780', 
    

    
    '86f48ac2-7841-406a-88c8-20e12ad222e5', 
    
    '87636c03-c13e-4042-b161-fa8b4eb15220', 
    '87830fc8-bd22-48fd-8296-77fba29260a8', 
    '8797c992-746f-4cd1-a2f7-e3b92512ab63', 
    

    
    '87c4b8e4-c022-4da0-ab3c-21c832a052b2', 
    
    '87e5a835-7723-4a91-9055-408b16cd7abb', 
    '88038641-c1e7-425b-a346-ba75d4e85bbf', 
    '88539001-fade-4506-94f5-67dff88334a7', 
    

    
    '8878fc8f-0ff9-4df4-84c8-21ba19194d32', 
    
    '88ad90bf-54fe-4865-b234-9d55478872eb', 
    '88f007ee-be05-40c2-a214-f279e467f110', 
    '890df5b4-1982-482c-880a-318a8b6608f6', 
    

    
    '8911c2b1-b508-4448-8c03-cef288368cbc', 
    
    '8942b4b9-8a95-484a-9b6c-4558274441f7', 
    'c1e3ef1b-9240-4cd2-970e-7754edcf7fb5', 
    '89645869-7cb6-4ccc-96f4-d8a51c2fc3e0', 
    

    
    '896f9f1f-c702-4092-868c-aa1b26e30798', 
    
    '8985df2a-77fe-411b-bd0f-933a05c40cde', 
    '89a0331d-859f-49d5-9607-898c534cd32d', 
    '89b0ba8d-ecaf-41c7-bdac-6dd86c0d189e', 
    

    
    '89b6c429-24f1-458a-9f84-b1aeb13bf416', 
    
    '89bf119b-4b7a-4d59-a575-c046ecb5b59e', 
    '89effd9f-7eb1-4ed2-8644-91d61ae862f9', 
    '8a139b78-f5b0-468f-985c-44a3fafb02d1', 
    

    
    '8a641674-e1dd-4b9e-a432-2abe8a9694b1', 
    
    '8b04510f-5810-4030-a3cc-62c9d84740b3', 
    '8b8dbc9d-2faf-4301-9d02-4195a78b940e', 
    '8b925a5c-6771-4fce-b734-369717fb39fd', 
    

    
    '8b97403c-b86e-4134-8d86-ad221273e6ae', 
    
    '8bd0660f-fbf0-4d38-9652-3683ebecbfd1', 
    '8bf8773d-1404-4353-80a7-8a539ef8c6cc', 
    '8c12b55f-22e6-48db-a96c-0377643860d1', 
    

    
    '8c6bf8a8-00c6-4052-8d80-b77c80c65337', 
    
    '8c82f305-4fed-4296-ac29-597cfdbc728e', 
    '8ce2a4d5-5d1c-43eb-a944-f3ce923c8874', 
    '8cf16809-9c52-4e40-bcac-8ae28db80276', 
    

    
    '8aceaf6b-cecd-4415-9389-b7dd402546b5', 
    
    '8d1232fa-ba8d-4769-bc05-05dac1c14adf', 
    '8d2df22c-bf59-4f5c-bbb3-3bb38ab36dca', 
    '8d6994df-463b-4aca-b4a0-aad837d92c02', 
    

    
    '8d84eec4-2aca-42d1-adc0-fc3110ed58e3', 
    
    '8d9baaeb-4777-4e9c-8523-809d9d18cb2b', 
    '8dc89ced-d5a8-43a1-a297-0a51d08d05b8', 
    '8dd982b0-4429-430c-9d31-5b73ec51630e', 
    

    
    '8dda6049-e683-4c78-b6dd-4d406e4c8e7d', 
    
    '8ddf5687-e4c2-444e-9fb6-ddf2cc0817d6', 
    '8e5bf09c-7a23-45c7-b2ab-7e47fcebec13', 
    '8e6a4014-571f-4be6-8b02-1d52d12b5adf', 
    

    
    '8e94fc1f-5300-4964-bb15-00c540f728ac', 
    
    '8eabafe7-0407-4c8a-a018-d6251acaee2e', 
    '8f2817e0-3caa-4451-a330-b9d22d4edd34', 
    '8f303473-c477-45b0-adb8-65c6bc544226', 
    

    
    '8f423a1e-ff55-433d-986d-c2b97708ca7d', 
    
    '8f5176fc-77f5-499a-8880-2449b27f316b', 
    '8fb48e67-c79b-4e52-96cc-0b219d812817', 
    '8fe7add4-ba1f-4d95-8868-51dc6645bf97', 
    

    
    '90168da7-9e43-4ce2-85c6-033ff90b91b6', 
    
    '9057fd3f-5f3e-4715-9614-db0c1de7c2ff', 
    '906308c1-7262-4e70-b72c-55696182bc40', 
    '90c10910-654c-484d-9b78-7a29a3c1b647', 
    

    
    '90ca3ca1-695d-4118-ab42-6e30dfda79e4', 
    
    '90d2c2cc-e474-4679-94dd-0f3fec293129', 
    '90f0ff5d-8662-4857-b0ec-b7ec9517748b', 
    '910da779-329a-4429-bdd2-046745332d02', 
    

    
    '912584f2-a085-4ad6-b756-d1c6f74c603c', 
    
    '912ed6c5-9fb1-4c99-9135-eb983d014f25', 
    '917c4289-8c3b-4ed3-bc85-ce375acc9466', 
    '917d34ca-f620-40bd-9dc6-0a6e94faf082', 
    

    
    '9182f685-d673-4af6-b2f6-cd137258506b', 
    
    '918a43c3-bdf9-4020-9045-10cb8cc7c422', 
    '919bfec4-9e28-4c46-8398-9f62061d40c2', 
    '91a5e8d2-b492-4b4e-a129-fa5a36208d0e', 
    

    
    '91ae2c84-b689-42ed-bcc1-80c15b663a48', 
    
    '91e857cf-e967-4275-9efa-01041182f596', 
    '920a8829-532a-4421-9731-7562e2060fdd', 
    '9223583e-3181-4cd7-af0d-5624f5d601c7', 
    

    
    '9285d81a-79a8-44b0-b440-2f0ffed78dd0', 
    
    '92d9ce00-5215-4d0b-906e-456abbaa21de', 
    '93021601-e9ca-4807-a232-49db1dc349de', 
    '93048a15-8104-43a3-800f-75753aa20146', 
    

    
    '930d5c62-5346-4f40-929c-33efd291f22e', 
    
    '9323d524-4448-40cf-af47-e2b0fe5fdf01', 
    '93835ade-4942-474d-8b3b-79ceb42e5ba9', 
    '93cda3c6-a809-4b1f-922f-46dda4ab242e', 
    

    
    '93d5d915-c6d2-48e5-95d2-c85a4c9e0db0', 
    
    '93dcc1f7-4d4e-44b5-af38-b56635d2912e', 
    '93ed66a6-f0ab-40d0-ba46-805109896724', 
    '9423d73b-cbed-4c66-8640-004d0d5dfe84', 
    

    
    '9478f49e-0e66-40a6-87b7-37f817266ae8', 
    
    '94ad4b76-3639-4bf1-b5db-d640f501dd0f', 
    '951dbb0b-8398-4175-a1cd-f1d9d43287d8', 
    '9539c93f-b31d-48ba-b485-8badbba4fd84', 
    

    
    '9555f5af-d40d-4e1b-bb1c-4a8ae2e15270', 
    
    'f97cc3df-f715-4788-8539-0b4089b83a18', 
    '955b10a8-9ac1-4a1e-a768-a53be313eed8', 
    '95b83829-e267-4497-a213-327b91d0ea1e', 
    

    
    '95f5479f-aa9e-4dff-bc78-d0c54c2c3c83', 
    
    '960add14-3391-4c9e-aa56-8e6d2193a1ab', 
    '964f9f8c-6662-4ac0-8563-54476f49e9e8', 
    '9655fd41-3554-48b8-a423-80b5545df981', 
    

    
    '9692e9fb-9433-4725-92ba-f8bcbb7ac78b', 
    
    '96b492e0-1f1b-4397-a96e-b95ac1aaded6', 
    '96d12be5-4477-4ca5-a2e7-dcc9b83fa0a2', 
    '9712bd9f-7840-42bc-bb69-7f97caaa2c47', 
    

    
    '96d3c6cc-4a87-49d2-87a0-8007406ab5e5', 
    
    '96e45830-fe26-4fcd-a595-025096c19045', 
    '96e9d075-e0ac-4bc5-b633-d2d77e6c91a2', 
    '96ec0e26-17ee-4a6b-9b95-fe7cfc85b304', 
    

    
    '970228eb-c443-4643-b52b-2c10fe56522e', 
    
    '972b2800-9895-4ffa-8959-deda052b690e', 
    '97cd51fe-a40d-4bbc-8008-4a3b3bae334d', 
    '981bce48-dd7c-4062-8bf7-9bfb161d1a5b', 
    

    
    '981e2cbe-a914-4891-ba19-0339b8bfca71', 
    
    '98232d8e-7f82-4f3b-b506-7ad9bb9d33c5', 
    '98882a45-61f2-4d8e-99b1-ac48523793a1', 
    '98921bb3-554a-40d6-a0a6-3d86190e487a', 
    

    
    '989af738-266c-4cc0-a3b5-2f2cda95f338', 
    
    '98ca59a9-3115-4d78-9d41-ba449ef50a79', 
    '9903609e-2345-4180-a129-40c277998e17', 
    '99876300-c691-453e-9de3-f32824b09dab', 
    

    
    '998ded1f-e3d8-450b-aa9d-914431070d58', 
    
    '99bfe735-85a5-48df-9010-82d64348c6a3', 
    '9a19f99a-6c62-4a37-ae42-c0ec3badf1f5', 
    '9a257255-8fb0-4d9a-a95f-1608b7dd1a5b', 
    

    
    '9d2b6ab6-3c06-446a-8cf1-c2a8bd56ec21', 
    
    '9a6da7bf-c698-402f-b091-37f5e8fa4da5', 
    '9ac76bc3-695e-4ada-8d5c-634fea599801', 
    '9b27186e-418f-4c5c-9c1b-5794b87cee24', 
    

    
    '9b34f671-9594-4f8d-b704-25536b589b79', 
    
    '9b62f9e5-d65c-4aaa-8558-a196d765c607', 
    '9b81ed8f-a1db-4141-9e26-7ab6abe937d9', 
    '9b8a9f9c-808d-419c-9c80-6f731e239a4b', 
    

    
    '9c1ab184-d0c9-4ec8-b28e-c138284bf044', 
    
    '9c1e6337-373c-4c0e-8608-d813637898c1', 
    '9c3079b8-cccf-4aef-bffb-b839e5ba7393', 
    '9d4c51cb-117b-4c26-b9ba-006c6f290ac9', 
    

    
    '9d66a0a6-8b83-41fd-9de9-d1653458f962', 
    
    '9d7ed4cc-4722-478f-987f-9b9a3d61928a', 
    '9dcb80e7-b52e-4f3a-8b6e-978cc585aff1', 
    '9df104f9-33b8-4d70-862f-9995b8adb60e', 
    

    
    '9e144595-e7bf-4a52-a9c0-f4bc3cee64f0', 
    
    '9e49d412-e571-4ddf-808c-2f568093659f', 
    '9e798ffe-cd3d-4c91-a2ce-86d4675104a3', 
    '9f49da24-b3a5-4f4f-ab70-32fd96bf2437', 
    

    
    '9f84477b-8ad4-42ac-9782-9a50c2d09baf', 
    
    'a0bc138c-1a4a-454c-8cec-3ebe752827b4', 
    '9fccdeb5-8ac7-45d4-8984-c01e30133c81', 
    '9fcd001a-89e9-4735-9770-47973582ad5a', 
    

    
    'a065ffb5-0a50-4796-a5af-23d9d3ffe36a', 
    
    'a06dd206-27ee-4c71-86ff-85a3b6f0672e', 
    'a1131006-df27-49a6-8f76-ed1d35ac1176', 
    'a1923a7d-eedd-4b65-a411-0c2d82065930', 
    

    
    'a194e7a1-b3c7-4019-af3b-46c002be1647', 
    
    'a195d7e4-03fd-4695-8470-0f696577ed30', 
    'a22cbb8a-d7c6-4ddc-8392-57a26fad5acc', 
    'a27f5002-ab8b-47f7-b3ef-65cfc5f42286', 
    

    
    'a2f278b4-6797-4f10-8265-068acc2f7b1e', 
    
    'a316ba1d-4623-4df6-90c9-5ea19568ce09', 
    'a38f265b-2261-4bca-87d3-d791e3f2b3ce', 
    'a5225e42-d09e-4f76-9cc2-1840642ca4b6', 
    

    
    'a3c871ab-6564-4ae6-bd7b-f0a3c0d1c06e', 
    
    'a3fb22d1-c231-4fa0-bb05-ba75f827f5ed', 
    'a451bc91-43b1-43f8-8d2e-bbd5a9c76c4e', 
    'a46ee5ef-4909-450c-b3ef-8e218dad9c63', 
    

    
    'a478f6f1-f81d-4f1b-8b29-dab546b49e1b', 
    
    'a540f7a9-e1c9-44e5-a8f3-dd2fdc165f4f', 
    'a5d09528-4664-448d-a114-b026036cd86b', 
    'a5fd8810-d06d-4af6-86e2-d15cad794007', 
    

    
    'a5fe4632-ef74-45bb-a353-71f073e29844', 
    
    'a6151f22-5f4c-4446-90b7-16477fcc7475', 
    'a61f3b43-98dc-453f-baf3-86dc4e922beb', 
    'a6482450-63d4-4eff-94ae-b7ef68aeadb0', 
    

    
    'a64cd1a7-90e7-41ca-9920-e3dc2f2591e4', 
    
    'a65ee5b8-181c-4126-affe-0100d6ab837a', 
    'a680a26a-a681-42b6-b441-9c5b3adaaa62', 
    'a6d7caec-86af-4101-be03-aea4bfce9d2e', 
    

    
    'a6df019b-2107-4454-8954-d31f5d28316f', 
    
    'a7103ccd-05ee-461d-a356-c50e59c0cccb', 
    'a732687b-093c-4fae-9ade-ce6cfb1a3678', 
    'a74f2eca-4426-4173-ae0c-3c6e300821e1', 
    

    
    'a7a26638-11be-449d-bd20-3a4ada5bb888', 
    
    'a7c268ff-be9c-4856-8b13-7846f1bb94d5', 
    'a7d7f4f6-24f2-42cb-9c21-fb0fdf7502cf', 
    'a7f876ab-a092-4f78-a557-685b9a0bef48', 
    

    
    'a85fb1da-a69d-4d2c-8d03-ec15f5bb2b36', 
    
    'a870d400-5b59-49b7-bbc6-737fdac28c0c', 
    'a8729713-0bcc-4951-b821-c1efd8acbdbc', 
    'a878f0d2-957d-4d26-b1bf-860ba6a9e10a', 
    

    
    'a8aa50cc-205a-4ab0-9cf5-715683696309', 
    
    'a9581da9-d850-450a-9de9-f01d5ac2f122', 
    'a9b8d41a-cf13-4400-b825-771511df77d3', 
    'aaf17d98-1be0-4de5-a0e0-586d0ac94164', 
    

    
    'ab0dbc32-bc91-45b6-8507-e8ff065b6b4a', 
    
    'ab1277e6-6aae-46eb-9414-559fe7b14933', 
    'acca2e3d-8885-4659-b0a7-c9091926a1f1', 
    'ab230b1e-2ee1-4be6-beea-6b0651909435', 
    

    
    'ab59e054-cbb3-4c17-a309-d1db754f1212', 
    
    'ab7ef628-cb05-4ca6-b5a2-67a75827040b', 
    'abfb7195-7711-4ae2-84f4-0b068b276e7d', 
    'ac68a5c7-07e4-45d0-b5a5-16735c72f81d', 
    

    
    'b0326a63-9ff2-43ee-8ecb-f9ebd59cc7aa', 
    
    'acfc262e-2e36-4ce5-8e1e-fc471a1f52b1', 
    'ad0ef0fe-66cb-4ec1-b126-9a742cca403d', 
    'ad204801-638d-469c-b281-10faa652e527', 
    

    
    'ad25346c-4965-496d-abb0-57f2c40398ac', 
    
    'ad8bb315-c6aa-4564-93e1-114b6a69026b', 
    'adf3d2c1-727d-4eb3-bac8-6d3dac4f84b5', 
    'ae24f299-e41d-426c-83b5-578edbdcc3d6', 
    

    
    'ae471b39-b5b4-4a7b-8ff4-ca640c592019', 
    
    'ae88b7c7-4899-46ce-9ecb-19abaf0d0c4f', 
    'aebc584b-4fd9-4d99-912b-78530832e11d', 
    'aede6805-f09a-4637-b2a1-a82e47911ef0', 
    

    
    'af185dfe-fda7-4d99-a980-7dab36f68cf6', 
    
    'af3b1b2d-1638-4977-a77e-c14cb5c85dd5', 
    'af5d5c09-1974-455b-a882-f600c6c4a831', 
    'afb05f9c-4ce8-4ece-9dc4-837a646c21d1', 
    

    
    'b023e5d1-c4d7-4efc-b679-bbfe6d0162d2', 
    
    'b0326aa4-b7b3-487d-9c1d-2717e360c3e8', 
    'b050f81e-61ea-495f-86b5-506c07278977', 
    'b054f9a1-61d1-48aa-95aa-f3495fe3391c', 
    

    
    'b05e6235-d504-43f3-8b25-e35ade9aadf6', 
    
    'b1494ca6-df89-43a4-bca1-9743c23151d9', 
    'b06970a4-bd97-4882-85fc-1ba47eed5f9a', 
    'b0c0610f-d597-4725-ba48-dd852f0d2486', 
    

    
    'b0f8fc0b-2d58-448e-b379-e0f17770160e', 
    
    'b107d703-9308-45c8-ac63-a5929030739c', 
    'b1363900-ef89-4b4a-bc08-b8264f5d10d9', 
    'b18f90b1-03b1-47f9-a86a-ac6f490720c8', 
    

    
    'b197a11e-c134-4409-b795-ab7b8f553c12', 
    
    'b1a19fc7-a4ca-4349-b187-bbeeb91c6020', 
    'b1b1494c-fae6-406d-9499-320eb2055e44', 
    'b21de13e-239d-4365-8873-663263ff2df4', 
    

    
    'b22d07b8-8b5e-4827-96c0-4070fa773cc2', 
    
    'b24cb1ce-715e-45bc-ad54-7a178e795978', 
    'b25591f4-65eb-49bc-a3fd-6b00aec69df0', 
    'b264aa63-d0f0-4c22-84ad-410463e2fff8', 
    

    
    'b3d97410-b1de-4d1a-84e0-0eaf702aad0e', 
    
    'b266a2d4-b92f-470e-9423-c9aa44208dca', 
    'b294aa73-f9ac-4112-97b8-eeb2d89e29c5', 
    'b29586b1-251c-4500-b152-dc4879ab86b5', 
    

    
    'b2ef361e-62f3-4375-a457-160057f042aa', 
    
    'b37f87e3-fb68-428c-adf2-1e5222e86802', 
    'b40f26f3-ef5c-448e-9b8e-855417b7d177', 
    'b43fa2b1-b0c7-4761-b92f-16440562949e', 
    

    
    'b464f256-a37c-4c29-a877-6b391c8c0068', 
    
    'b4cb6746-fb72-4cc6-a01c-77be67ffdf45', 
    'b51f9018-191f-48ed-b004-8352a2d92523', 
    'bcddf638-6693-4310-a1b2-e36ef4b852f8', 
    

    
    'b56f9436-f8d3-4b93-8937-936c4a41ed26', 
    
    'b5b2a495-ddf6-4ae1-ae31-c0cb64c55e57', 
    'b5e32c11-d7cb-4c72-9678-647aa33e8417', 
    'b5e40e28-39c6-417c-a8ba-e5a3eb5ec35e', 
    

    
    'b617fcc2-9110-4553-9a32-3b97c890ef22', 
    
    'b663a6f7-35f8-4567-8c96-b93621c6bee8', 
    'b6be7755-5b1a-4479-8c50-0294d82f8667', 
    'b6c22809-866f-4768-a6d4-73d254d20c5b', 
    

    
    'b6ebcfe3-4c5a-49c4-b66f-c724f2562f8f', 
    
    'b6f906bf-f9be-4f05-a47f-d55b2031a9fc', 
    'b70e6425-9854-4714-af40-64cbd47a9ad1', 
    'b8016575-5218-455e-916b-8309364ba8e8', 
    

    
    'b8106839-a31f-4854-885c-b7c7ab11df03', 
    
    'b8515d1f-88da-4a10-8b8d-6dd2360f0ffc', 
    'b87b46f4-1d68-4628-ac9a-c9163131fd20', 
    'b94260ad-42b2-4fcb-9752-e1a491e901e1', 
    

    
    'b9483c49-e1fd-4ebf-9b57-6bdc9cec3c49', 
    
    'b95db8e3-2aa6-4efe-a48f-ead54158083d', 
    'b97f95eb-0139-455a-bfa9-01c79566e59b', 
    'b9903256-e404-41f1-b435-23d3bcc45006', 
    

    
    'b9acb27f-e01d-4d5c-b02f-a45e31cbe481', 
    
    'b9b43204-945e-4c91-90a9-622488bd9294', 
    'b9c80a36-1c2a-43c2-a589-045f050e0895', 
    'b9def718-7363-4d32-a023-43fc13e495a8', 
    

    
    'ba8f72ed-a493-462b-8e4f-90a79f4f5272', 
    
    'bb18e8e7-1d51-4e78-bc67-e58b9f81087b', 
    'bb226bd1-a0fe-44fa-b3d8-b377f98b31a2', 
    'bb260618-c3c2-4cb5-970e-7a43fbe21cd3', 
    

    
    'bb289b89-d49e-43f7-aa65-44f25c41f935', 
    
    'bb73aa87-b56f-48ff-94e8-00d07ee1ce53', 
    'bbebe008-5b5e-413f-ae98-5ceb244184eb', 
    'bbf15e8f-6194-4079-801e-d2e9852759ef', 
    

    
    'bbf859c0-7a3c-4f84-95fb-38f2f29f84e0', 
    
    'bc40ded2-de3f-4367-b447-81915950ca2e', 
    'bc52aaf2-24de-469f-a91f-9c5fbb92bd43', 
    'bceadb81-677a-4500-acce-086e0dea2592', 
    

    
    'bd07139f-6750-47ba-ae77-a99dfd9bc439', 
    
    'bd515e70-2bca-48b0-9c05-1ed637627273', 
    'bd79e27b-f65b-4461-a6a0-a39085b9658e', 
    'be877269-d629-43ba-a6dd-22f47891a374', 
    

    
    'bdc7caf8-8018-45d2-9cfa-83f62f01d03a', 
    
    'bde3c0aa-f675-44c3-b2ac-3022f2a87147', 
    'be1ed648-7c00-45e9-866a-f8800254731c', 
    'be58b4e9-1933-4b81-975a-9761ed6aeb96', 
    

    
    'be83a76a-8983-4973-8eae-907ba41a6c50', 
    
    'bedbde42-68fa-4756-94a9-2567bc38dc04', 
    'bf2c5e44-2317-4eb0-b17f-624e59117529', 
    'bf44bb6d-2e42-4d51-b439-69bb0193ffb7', 
    

    
    'bf6f96f5-8a98-4ef8-99fa-012d5215cd13', 
    
    'bf71bcb4-c39e-43d6-b25d-1bfbcfae9548', 
    'bf9889d4-9f4a-45da-9d57-e79d3f7149e7', 
    'bfa58ba3-a2ae-4697-9b7a-47d4e1264755', 
    

    
    'bfe4f885-2a4b-4176-a492-f86d16a1a939', 
    
    'c0f439d8-930a-4e7d-986b-3945fc1b836d', 
    'c103bd18-8e9d-48e3-9deb-7afb64023063', 
    'c12b578e-0e9b-46fe-a646-071a873359f3', 
    

    
    'c1378f74-2656-4662-baf5-801b30d1e2a0', 
    
    'c16b218b-09e7-4d8b-b25a-0b86ee04070c', 
    'c17d5b65-a84e-40ef-8e63-aac20b5d85a5', 
    'c19c4c1c-fca7-4101-a5f2-d9058f34ae1e', 
    

    
    'c1f4d6c9-a94c-42b9-b560-10dd0fe1be24', 
    
    'c22d96f3-0456-4054-91ad-ec124e918a77', 
    'c23d469c-ee6b-4f30-ab85-8a52b0da8d0d', 
    'c29a4fe5-d776-4a91-be22-a4092ea94a52', 
    

    
    'c2e514d3-6056-45ac-bdbc-191e19c2ec69', 
    
    'c34d99b2-f5f9-493f-a7ab-8ef4995499c8', 
    'c38652fa-8d4c-4d29-8130-d68c51647fb3', 
    'c4826558-37a8-4f4f-89f7-98e1928d700a', 
    

    
    'c4c56310-9a45-47b3-8f86-d5cedce981a2', 
    
    'c55871fe-048a-44a9-908b-1030ee5e7868', 
    'c55dbd1d-3d8d-4d20-bcb8-5da7c43be32d', 
    'c58792a0-036f-4051-96b5-33014bc3e875', 
    

    
    'c592411d-e032-4ca3-a4b5-807eb1b98a48', 
    
    'c5a0a7c7-8905-4db0-9d11-8f1e6289280e', 
    'c5bdbb63-e8ee-4ddd-9c9d-f6ef5d936aba', 
    'c5c8475f-fb13-4179-94fc-1acaddb2e692', 
    

    
    'c5f6ecdc-9d77-4231-8b32-a5fb1fc53bed', 
    
    'c610cb21-7959-464e-8a45-99b5819b1264', 
    'c6893170-11f6-40d2-b36f-8e26196f71bc', 
    'c6e1e66c-d123-4740-8a77-c0b0d1eb8516', 
    

    
    'c703e077-8802-4094-97fb-571f9d8b6d5a', 
    
    'c73fdf7f-7921-4efd-be76-c185118ee678', 
    'c7500c92-3f2c-4189-928b-5a7f5a78ba35', 
    'c75a84ca-945e-4861-9444-0ad0e7ac4d21', 
    

    
    'c847a454-6ab8-454b-8441-2c3aa42992f2', 
    
    'c8660271-9f13-4e4c-9419-80b116479508', 
    'c9348115-f5cf-4bd0-b9f6-117e23ab2733', 
    'c876cb1e-ad23-4e13-9356-b1e2825095ad', 
    

    
    'c8863db4-96c2-4e2f-83cc-ca1aa131ab18', 
    
    'c8f63988-a8a3-4b8e-b05e-cb3e959f95ec', 
    'c92a010e-810b-404e-a24a-b9af38135151', 
    'cadcad62-cdbe-453e-9b89-37d89ad0b996', 
    

    
    'c936f0b9-2bdf-4789-808d-02515c12dcdd', 
    
    'c9529037-fdb6-4d78-94e7-83922ed6755d', 
    'c96b54e4-6887-472d-9819-04e55918c888', 
    'c98f5991-11f2-418c-9bb3-2a237122a935', 
    

    
    'c997d978-bcef-4b99-a3c7-e1e9664ce86a', 
    
    'cae6f461-73f7-44b3-8ebb-d528ad5b6b71', 
    'c9a4add2-d0dc-41da-95f5-d9b62c300ec8', 
    'c9bc4476-b9f4-431d-a350-725588c661e0', 
    

    
    'c9dccfe7-723f-49d9-88d4-a8c393f3b9eb', 
    
    'ca090b38-11b2-4787-a788-737f8ceec720', 
    'ca2a6421-bb40-4555-af89-e5139fe342eb', 
    'ca39da31-e9de-47b9-9b72-c363fdeb5443', 
    

    
    'ca44f1bc-dd23-4261-8408-4c22d713e7c1', 
    
    'ca621598-2633-46a5-841c-238ca7a0a697', 
    'ca8b668a-1493-4ff7-8e75-1bb44605e181', 
    'caa8c5d9-e0dc-46ff-8166-e2c594779169', 
    

    
    'cb03e2c8-3a13-4738-a61e-db8bfeeae5f2', 
    
    'cb2b9432-e98c-4c01-92e4-0ea6968d47b4', 
    'cbb2fa16-7880-499b-a148-edf198805296', 
    'cbb64697-4843-4955-8dc8-7be8ee4ab8ce', 
    

    
    'cc62007d-966c-42a6-bdaf-94ab09b56479', 
    
    'cd4963ff-3b06-44be-ab09-c50cdd4d7b4c', 
    'cc69e437-62a5-40fe-919d-5e6c8496ef81', 
    'cc6fc4fa-4f8a-4304-a6f3-1581f17e4d36', 
    

    
    'cc7200a2-0bc1-46bd-bbeb-f1eb9202df6c', 
    
    'cc8505c4-55eb-43c3-82a2-d60ec41a8d06', 
    'd55a07a1-6369-4eff-b2bd-4a882cb5ed33', 
    'cd978976-9b2e-4857-b009-0fa18a5c8680', 
    

    
    'cda4502a-f34d-460d-9ab6-9335691a368e', 
    
    'cdf6b2b2-fde2-4f36-8e11-db128b726892', 
    'ce5e33fb-a95a-4399-a23c-6bd80b6a6a57', 
    'ce7df630-ecb1-4e64-91c4-2e280c26d8bf', 
    

    
    'ce9b7365-2f0f-4c9c-94d1-82b35c815883', 
    
    'ceaba1db-8618-4731-98cd-b73fb0b4783d', 
    'cedaa2e4-f977-4925-bca5-a0dc3b49fa19', 
    'cf8a58d9-85b4-43fe-933f-f932f82d7b5a', 
    

    
    'cfa3983d-4d42-48e7-9cf0-3752abef45fb', 
    
    'cfb55fba-174d-43ac-9f8a-32528db1cb8d', 
    'cfb6e799-df8a-4a61-b6e8-d78894be8407', 
    'cfbafef3-eab8-4273-b48a-c736d9ea5eb5', 
    

    
    'cfbe03ab-ffd0-4d0c-8132-93e6d5bfcf01', 
    
    'cfeac667-2464-4f88-93ea-bc7a041be2cc', 
    'cfef3ee6-565c-4765-bf24-6cb8a7dba1c4', 
    'cff53811-177c-4d0d-accd-83c0b704ab42', 
    

    
    'd0457f20-6f10-4de6-b360-0b2f937aa635', 
    
    'd09840e6-52e8-4ad5-b403-5acdd8cedb6f', 
    'd589f9c7-2bc5-409c-879c-5bb5de5cd619', 
    'd0db2a91-7e5c-494b-a276-ad573d92a760', 
    

    
    'd0ebafd6-e6a5-432a-a3a3-85775fdc18db', 
    
    'd0f7accd-b578-41e7-a1ad-b84fd2aa8d1f', 
    'd11be901-1250-4113-a05e-4290e460db4b', 
    'd17a78f5-ee42-443a-9a01-afc471b1e6b2', 
    

    
    'd655e174-39d8-471b-9062-f300e5ca6836', 
    
    'd17ccaf2-a1c3-4c7d-881c-6b2884cbbed2', 
    'd18a06e6-ee61-4278-9c35-11f18aa2154e', 
    'd18f1dfb-6cb9-4dce-89b5-a9f22e391a6f', 
    

    
    'd1c08c85-1bef-442d-a0fb-fa9e7eee015f', 
    
    'd1fc9e4a-0f8f-483f-ba55-3f7a8466dea3', 
    'd26f240a-750c-424f-848e-a394ae65925e', 
    'd2e9881f-ff10-4fba-95a9-fe09da10f80d', 
    

    
    'd2ee4b96-b3d9-4cd4-b132-d25d82045bf9', 
    
    'd2f1c81d-3472-46cf-8cd4-46d6cec397dc', 
    'd2f22124-7eee-4813-9250-a87f066058b7', 
    'd2f5563e-97f5-4903-8176-0aacb09aa977', 
    

    
    'd3087308-cda1-47ae-b241-ca11c75cd349', 
    
    'd30f1b30-05cc-4b20-b310-e329409198a5', 
    'd33e5b11-1fd8-41eb-a3d8-516be01cdf7b', 
    'd35eadc9-85fd-4e77-a110-084605d6bcd9', 
    

    
    'd36746ae-fb6d-487f-8a58-494887ae3b40', 
    
    'd37ac80d-fcb0-4ae4-9f36-d8a93f0c99b5', 
    'd39c7c2d-2460-4f78-bb70-9073003f5e6f', 
    'd3a9e0dd-adb3-46c5-944f-2b44c95e67a9', 
    

    
    'd3b69090-317e-4f1b-a196-8ead4504750b', 
    
    'd3b70dfd-d5cf-4a9f-bab9-3c19625385d8', 
    'd3cabf2f-11b4-4b27-8ad0-f661f53b0963', 
    'd57e30f0-9686-4a98-a131-bf810ade7c0b', 
    

    
    'd3e08c57-2b5a-4ba3-b74c-2caee4c20d05', 
    
    'd446bd66-cab5-49f2-b9af-c8734acf63ce', 
    'd47a19ec-4125-4a82-80f6-f9c23882cddf', 
    'd49f4564-565d-4c17-a548-960b465968e7', 
    

    
    'd4bfb58d-dcaa-4d95-b93a-2b2b961f502b', 
    
    'd59ed8d8-4556-44a4-bad5-6a1be21d1f6b', 
    'd5f0c42e-7a1d-404a-8c6c-42fe89d0c44d', 
    'd6184823-a1e2-4ad9-a187-e179b6a5be74', 
    

    
    'd641d944-6f8e-4568-8456-36c6a209e48e', 
    
    'd64b7118-377e-436b-844b-02defb079236', 
    'd650ba04-9b58-4c83-85d2-a41eaef67fb8', 
    'd65fa140-05a5-470a-ae06-ffffb17bfa30', 
    

    
    'd68455b1-29a1-4fba-b5ba-569f3f2a427d', 
    
    'd69149f9-46c8-4b38-b672-d4d969337d8e', 
    'd6bd370c-29cd-4707-b315-2daf3449ce2b', 
    'd768df8a-49da-447c-95ff-138a9b8a44dd', 
    

    
    'd71f3520-2663-4a9a-85f4-1873cd22238a', 
    
    'd7363d08-9f94-48d5-ba72-42c8b8b57a7e', 
    'd73f71c5-e80e-4091-80b5-598608f92f97', 
    'd747528f-71c7-4abc-9cc0-433cb5be4bff', 
    

    
    'ff171feb-22dc-47cb-be39-adc3a4493d63', 
    
    'd80889b1-353a-488a-a4f0-44c96939186c', 
    'd8491460-4738-4fd1-be39-da785ff074cc', 
    'd84b48c4-f530-4738-9119-59400c11d63d', 
    

    
    'd86c8301-2c4d-423c-990c-4d45bf0c5645', 
    
    'd886c9b7-0c3f-4fa7-b7ea-e97b33917367', 
    'd88f791b-647c-4a09-97a1-065aebdc7296', 
    'd8eeb457-cba0-49a3-8037-16da9807ad1e', 
    

    
    'd91586e7-3156-44f8-924b-a732661deb05', 
    
    'd99853a7-1919-4aa8-a29f-c67b61aafa2d', 
    'da94766d-bfcc-4c07-bc86-8c90e295c060', 
    'd9b442ed-ef16-4e42-98e4-406c38a0b1cb', 
    

    
    'd9dbaf5c-27a9-4c0f-aa6b-e7d8b667711c', 
    
    'da03b1dd-9b0d-49f7-9de2-8b7e2cc41951', 
    'da11539b-8959-4d3e-aa8e-3e423ee8130c', 
    'da5f455e-f209-462b-b3b5-7bcda12e1b90', 
    

    
    'e6bbe2de-b9df-46a2-9bd1-a8145e7f0833', 
    
    'da9b7afd-4f71-439f-a451-e66303486fb8', 
    'db21450d-1b1f-47cb-ad02-bc241e6ec8a7', 
    'db5c3ffb-49c1-45a3-a85a-f0cb8136f92a', 
    

    
    'db638165-00ec-442e-820e-50a553bb50d2', 
    
    'db6927cb-8a70-49c3-beb1-485343fefb9c', 
    'dbf9ad14-2be9-4951-ba3c-4616bacb1c8e', 
    'dbfcaf85-6996-4df2-a25f-3d78d9fa858d', 
    

    
    'dc5147d1-5760-40fd-b679-e57a5ced871a', 
    
    'dcb7a248-0435-498f-9484-d69745381818', 
    'dcdc2c38-6310-470f-9188-9eaf49e44774', 
    'dda34667-1ad0-4577-ad73-f7dcb793b0df', 
    

    
    'dd1f3b5b-2059-4be0-9514-9695c74e1e85', 
    
    'dd91133c-eb62-4d73-8701-ed608dd792c3', 
    'dd97ac01-8d91-4be4-bde6-8eff12812681', 
    'dd9ac7d6-165e-4869-a81f-5c8de27a7339', 
    

    
    'de1102fe-a9c4-451c-8655-567b183b1a85', 
    
    'de268ad2-a46a-4423-a3e6-5f0fa22ff784', 
    'de356ed0-9040-41b7-a360-37fecf909463', 
    'de73be59-6710-4d92-9090-7fb22f6e5d76', 
    

    
    'df8f4c99-182b-48a8-b34e-324c08042ed4', 
    
    'deb9bf07-c280-46ff-8de3-7d18e713d286', 
    'decab3fe-b8be-496f-b91d-dcb3d08da44f', 
    'def923c4-833c-4f73-8d7d-d26a07e7cd7c', 
    

    
    'df655649-8f16-4df1-ad38-d2ec761f0e00', 
    
    'dfce2de8-4203-4e03-a08b-827e5f89fd92', 
    'dfd1d331-5620-42cd-81d1-90deadcbb296', 
    'dfeef183-0276-4665-a507-a431c3ab2bcd', 
    

    
    'e021d8da-452d-4a58-aceb-0ac6c9ce9686', 
    
    'e038b288-7f8b-44a5-a540-8ff8619cce4c', 
    'e073b1b0-7030-4bcf-8c29-bb863438c223', 
    'e745a21e-08be-405c-9faa-a6a53dea9589', 
    

    
    'e079bfd4-6a3f-405c-a48a-dcdabbe4f919', 
    
    'e094e1a3-e04b-4d72-bd62-6c80520aae64', 
    'e0b401b6-6d0e-4543-a212-683b957d4d91', 
    'e0d09a5b-37d3-4101-8d6f-4eef304718af', 
    

    
    'e0dbc89d-4e84-4c4e-84bf-2205a095baf0', 
    
    'e17a95b0-20b2-4af1-a7d5-9c807b71d459', 
    'e1a16a2e-c5dc-4ffb-a5d6-76636618ab10', 
    'e1d0373e-6be3-441d-b5e1-d7e2ad3353d0', 
    

    
    'e1d10087-4a43-4a01-9a2f-1b3d6ceedc87', 
    
    'e206a9a3-314b-4ef0-8efb-d7a328f86784', 
    'e279f34a-a32c-4983-a700-a053e1a5b84d', 
    'e2ae91fb-1f55-46bb-923e-54f90db37ecf', 
    

    
    'e2e1c597-8f69-45d0-bd98-e4447b752324', 
    
    'e351a791-2c54-4c82-a30f-9563e0d4555c', 
    'e3713bc1-a9b8-408b-a9ab-e12ce4d06e79', 
    'e3b335af-e3d7-475c-9d48-53d071c4274e', 
    

    
    'e3ed64c9-c32d-45ff-a5c6-186cb6197e6b', 
    
    'e42264e3-7134-4790-a1ef-c135b174e179', 
    'e4839c0e-95f2-474e-96f9-60afb1418e56', 
    'e49c9914-13ee-4ab9-a95e-2313ec13c071', 
    

    
    'ea6744c7-80ed-4e1e-88d3-3080e604061f', 
    
    'e4c6732f-29f5-4a16-a3d1-78cb5804eedd', 
    'e4d74a87-db58-462c-99e7-cfb2e5c817a4', 
    'e4f7ef60-7d1b-40d1-a75e-8eeed93d1dda', 
    

    
    'e51efd6f-135f-4ab7-b25b-743dd18ef0f3', 
    
    'e5202395-092a-4c24-91f0-c26689c7dd20', 
    'e5292918-00a0-4450-bbdb-d222a62ea5e9', 
    'e57031c6-a158-45c0-b932-d9c1b3bdbfba', 
    

    
    'e573a0a4-1b57-47b5-82c2-81fb96f0ba15', 
    
    'e5b27146-c7e8-4825-8a5d-9f309c049a27', 
    'e5faef6d-3ea0-4e5f-bba8-a248ffb65a49', 
    'e5ff105d-bb5d-4b58-9db3-a03059bdd384', 
    

    
    'e6453c12-f253-4770-9b85-741bf4d31326', 
    
    'e692bf7e-6807-4029-a6c8-9b261725291e', 
    'e6a128c3-7f7f-4b40-9220-b60754d2f2f5', 
    'e6a4754e-bb33-41e8-b29c-b7e78fcbafba', 
    

    
    'e6ba2f69-36b8-44da-9301-098870d809a6', 
    
    'e77ef354-8220-4504-9224-73f8622a7d00', 
    'e87b716a-080c-406a-a0ed-5ba4bf364541', 
    'e89d3300-dd4f-457c-adc0-ec97fc8382d2', 
    

    
    'e8deae5e-4169-489d-a7a0-285f4c924545', 
    
    'ef434e5f-4816-4d7d-95c5-0c290cc8af17', 
    'e9034120-5ccf-4bb2-aa4e-15711f83264f', 
    'e924c5cc-8c8a-4e68-98f7-0e82e16590da', 
    

    
    'e94550f5-a356-45a6-80f4-c52e41edf85d', 
    
    'e9a51bea-f2cb-4170-9185-5653728085b0', 
    'e9e2aed5-71ed-431b-a286-bad9052dbed9', 
    'ea7992be-3ca1-499b-935e-14257f59a71b', 
    

    
    'eacbf2f8-3bda-425c-b3bf-79302c36a9fa', 
    
    'eae80bad-e42d-4ee6-a55d-1e304aebd1f0', 
    'eb1c49d2-cf7b-4b36-9608-761fa462e614', 
    'eb43d4ea-8bec-438f-aa2f-eba0b1ebb747', 
    

    
    'eb576de4-3434-47cd-9f76-09feee0449f7', 
    
    'eb60da68-49aa-4566-825f-ac8c04e58ef3', 
    'eba5eabf-4957-4273-ad66-6c2104adfd25', 
    'ebe83b5c-49d5-4d49-abec-1ab270e9e57a', 
    

    
    'ebedc43b-3927-48d5-9292-efdd8a6626ab', 
    
    'ec1fe90e-9f5b-4f05-86d4-b0ef917e2197', 
    'ec604c5a-0cf9-48fe-9e86-1ad987240efb', 
    'ec88558d-1ba8-40fe-a44b-3bc99393590a', 
    

    
    'ec9955a8-4898-4548-9ffe-134b78bd1a83', 
    
    'ece230bd-a94d-4e32-9485-ba294396ab97', 
    'ed24a8a7-451a-41f2-b67d-38ff63224fb9', 
    'ed41457e-e12c-4e2b-a710-f3e939a97a4b', 
    

    
    'ed710138-f4fd-4a4d-a42c-f4658f0e0a89', 
    
    'ed8f5d0e-5d31-4d7e-81cb-8de617c8171e', 
    'edcf3cb0-697a-4b03-9f1c-2157c2751b4a', 
    'edde4c01-370c-4abb-b360-977e3eae31bc', 
    

    
    'ee20659b-c414-425a-b48d-5cff29ca0181', 
    
    'ee49365a-3145-4c2c-8340-a0608119bc2e', 
    'ee93e53c-c43f-4f5b-8e23-d6f40f2ce3a1', 
    'ef15d29e-c966-4626-9714-b69d06e6f4d8', 
    

    
    'ef1fd2dc-2345-4f58-b4e0-9ddeee5865dd', 
    
    'ef5e911c-2cd6-4a7e-b6e7-3bc63ace2c31', 
    'ef68f047-e2d5-4d72-bb75-084884262350', 
    'ef695221-1e96-41fd-8ce8-adb87c557eae', 
    

    
    'efdc2779-8b8a-4b30-9cac-0b325863142a', 
    
    'effce493-12b4-489d-ba97-42c3bc7679a7', 
    'f07621b3-c54b-42b3-9be1-48b86a9c57e4', 
    'efff36fa-13df-4daf-94e5-436b1f34d32e', 
    

    
    'f01303c0-f5c9-4e0d-ab4f-460a239b6251', 
    
    'f02be5db-4cb9-4512-bf83-e215e5bedcde', 
    'f05e695f-4fd9-4c73-82a1-eed2960cc7a1', 
    'f0905c40-9cf1-4830-98b4-f0d345203c0a', 
    

    
    'f0a542d1-813c-4977-999f-76d0ef818d2b', 
    
    'f0be6139-0fc1-45da-afaf-abe8edd232b2', 
    'f1ad7213-a36d-463f-b6ba-3bb4866a4636', 
    'f1ffd4d9-da85-4f53-af8c-b18beb2cbc06', 
    

    
    'f2d4116b-96f9-4ed3-ac76-33fc721ac804', 
    
    'f3e79d9e-2db6-4ae7-8d68-d2aae3d25325', 
    'f33306d4-462e-4ad8-a818-9aed29259dab', 
    'f346dbc7-93e4-49e6-a962-871cc1e08ec4', 
    

    
    'f35ab2ae-ad05-40d7-8f4f-8205dca5d332', 
    
    'f39f3a58-ab7a-4d95-bbc4-2957c0f5e60d', 
    'f3d07c02-73e9-4fe8-bde1-3b068b1d8b8d', 
    'f441fa65-0fc8-4bc0-a956-eb53e66754c5', 
    

    
    'f44df589-bd12-4373-8ff5-0534bf271816', 
    
    'f4574a0b-ecef-4e17-aeb9-6930ece217a3', 
    'f485f301-84d2-4fef-bc10-177e5458b4cb', 
    'f48a4940-92d9-4e63-a924-0382d0e4dc33', 
    

    
    'f49124e8-ea2c-42dc-8e1d-44ebec94c7b4', 
    
    'f4baea2e-5641-4862-809b-02319c806e9a', 
    'f5976eb5-f03e-4ec2-88c8-b8a303ec02cd', 
    'f5b4d1f2-ef70-48d2-8968-73da8fb1c3ad', 
    

    
    'f5c6d6c5-0520-4cd4-a788-cdcb9f56dc2c', 
    
    'f5f0ca72-f619-451d-8100-67049659bd7d', 
    'f76133f3-2db3-4827-9ed3-0cc54c83a0b9', 
    'f7680c0c-7cf7-4249-b4dd-52598059a43a', 
    

    
    'f779c70d-81a2-45ce-a25f-e86f15673683', 
    
    'f7b987b3-5704-4bce-93bc-dfad6ae3648c', 
    'f7c9952a-8bcd-4294-bebd-84b7ae3423a2', 
    'f83513e5-afb5-4bac-b86c-7f08d1197011', 
    

    
    'f84edb5f-7fa8-46b8-bf13-5bc50baf89c1', 
    
    'f93be075-9d2e-4568-9083-37a0b6b5aee7', 
    'f93edc76-f742-4a57-b16c-d837db4f5aad', 
    'f96a4013-9ed6-478a-a546-769f792d4c6b', 
    

    
    'f97fb253-1213-4892-9769-32eae63c791f', 
    
    'f9b31ee8-31d5-4018-b635-ab23fcc0c3ea', 
    'f9c832b6-ab87-406d-b44e-24ca26d5f17b', 
    'fa4ab525-0a62-427f-8ca9-ad0112fde18e', 
    

    
    'fa900df0-1d1f-4cbb-8267-d7114917cbd1', 
    
    'faf8828e-64c1-4089-b2b8-200ba4370850', 
    'fafac79f-1338-4846-ba60-99a6727259bf', 
    'fafc7b1e-52c4-47af-9d72-d6c1803421e2', 
    

    
    'fb59eddf-0b19-486d-914f-28ad37895e0e', 
    
    'fb6396e3-cf6f-4c63-9198-ab08abe5f824', 
    'fcb25814-5e00-44de-bf17-28948e9aef22', 
    'fcc7d937-1892-4a5c-8bac-1dfd05c3574a', 
    

    
    'fccb955f-5a8e-424a-8946-7968cf0d04cb', 
    
    'fd254844-c7b4-4b54-a9de-003687dcc585', 
    'fd88503a-8dec-4076-92c6-bb439adcb9d7', 
    'fdae49cf-6ff8-49a3-a39e-4f548772a5b2', 
    

    
    'fdb98ead-7a83-4e48-9924-0fa49a065e6d', 
    
    'fdde5f8a-ae03-4b51-8847-93b6b3f0e3f6', 
    'fe03ddbf-c949-4cbe-9b2a-22c7eda00863', 
    'fe0e733d-93d8-4fdb-8a0a-2006fa6c3378', 
    

    
    'fe172273-8c80-49c0-ab92-b8e3b38aed53', 
    
    'fe3b77dc-14b8-4e42-bf5b-2ff78e9f558b', 
    'fe439c38-bc50-485a-837d-1813bc18afb8', 
    'fec67449-acc7-4304-be28-4c10da4a29b8', 
    

    
    'fed96809-2fe9-4ccd-b6d1-c64e5491ff7a', 
    
    'd379132a-5bdb-4eb7-b7d6-ba6154ce521a', 
    '36df4cf9-5efa-41bb-9408-73dd8df38283', 
    '681675b4-38bf-45b1-a911-70b0a4749f31', 
    

    
    '1190fb1b-9a39-46e2-acc6-033959066378', 
    
    '70747efd-30ba-43e1-9158-e67c5e3147dc', 
    'f804b800-e21d-46ab-b83c-1494508649ff'
)
AND deleted_at IS NULL
ORDER BY updated_at DESC;

-- =====================================================
-- PART 2: INVOICES - Check for changes in existing records
-- =====================================================

SELECT 
    'INVOICES_MODIFIED' as check_type,
    id,
    invoice_number,
    order_id,
    profile_id,
    status::text as status,
    payment_status,
    amount,
    tax_amount,
    discount_amount,
    total_amount,
    paid_amount,
    void,
    "voidReason",
    "cancelReason",
    purchase_number_external,
    updated_at
FROM invoices
WHERE id IN (
    -- Paste all invoice IDs from current DB here
    -- Get list: SELECT STRING_AGG('''' || id::text || '''', ', ') FROM invoices;
    'YOUR_INVOICE_IDS_HERE'
)
ORDER BY updated_at DESC;

-- =====================================================
-- PART 3: ORDER_ITEMS - Check for changes in existing records
-- =====================================================

SELECT 
    'ORDER_ITEMS_MODIFIED' as check_type,
    id,
    order_id,
    product_id,
    product_name,
    sku,
    quantity,
    unit_price,
    total_price,
    product_size_id,
    notes,
    updated_at
FROM order_items
WHERE id IN (
    -- Paste all order_item IDs from current DB here
    -- Get list: SELECT STRING_AGG('''' || id::text || '''', ', ') FROM order_items;
    'YOUR_ORDER_ITEM_IDS_HERE'
)
ORDER BY updated_at DESC;

-- =====================================================
-- PART 4: GROUP_PRICING - Check for changes in existing records
-- =====================================================

SELECT 
    'GROUP_PRICING_MODIFIED' as check_type,
    id,
    name,
    discount,
    min_quantity,
    max_quantity,
    product_id,
    status,
    discount_type,
    updated_at
FROM group_pricing
WHERE id IN (
    -- Paste all group_pricing IDs from current DB here
    -- Get list: SELECT STRING_AGG('''' || id::text || '''', ', ') FROM group_pricing;
    'YOUR_GROUP_PRICING_IDS_HERE'
)
ORDER BY updated_at DESC;
