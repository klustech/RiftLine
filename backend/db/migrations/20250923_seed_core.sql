insert into shards(id,name,region,max_ccu) values
 (1,'Downtown','eu-west-2',2500),(2,'Harbor','eu-west-2',2500);

insert into reference_business_kinds(key,display) values
 ('LICENSE:Taxi','Taxi Permit'),('LICENSE:Cafe','Cafe'),('LICENSE:Nightclub','Nightclub');

insert into reference_property_kinds(key,display) values
 ('PROPERTY:DowntownShop','Downtown Shop'),
 ('PROPERTY:HarborWarehouse','Harbor Warehouse');

insert into telemetry_bucket_def(key,description) values
 ('client.fps','Client FPS samples'),
 ('client.thermal','Client thermal state'),
 ('auctions.bid','Auction bid events'),
 ('paymaster.sponsored','Sponsored tx count');
