NWMLS Advance Notice: New IDX/VOW Listing Brokerage Attribution Requirements







Hello API Data Consumer,

Northwest MLS (NWMLS) is providing advance notice of updated listing attribution requirements for IDX and VOW websites and mobile applications. The new display requirements take effect October 15, 2026.

To support vendor implementation and testing, NWMLS is adding three new contact fields to the listing Property record distributed through MLS Grid.

 
New Listing Feed Contact Fields


The following fields are being added to the listing Property record:

Fields supporting the new listing attribution requirements

Field

Purpose

ListAgentPreferredPhone

Contact phone for the listing broker

ListAgentEmail

Contact email for the listing broker

ListOfficeEmail

Email address for the listing office

Additional CoList Agent fields

The following fields are being added as part of the same feed update. They are not related to the new listing attribution requirements and do not need to be displayed to comply with these requirements.

Field

Purpose

CoListAgentPreferredPhone

Contact phone for the co-listing broker

CoListAgentEmail

Contact email for the co-listing broker

CoListOfficeEmail

Email address for the co-listing office







Other information needed for attribution, including ListOfficeName and ListAgentFullName (listing broker) information, is already available in the listing feed.

NWMLS is targeting availability of these new fields through MLS Grid mid-day on September 17, 2026.

After the fields become available, MLS Grid will reprocess all on-market NWMLS listings (approximately 45,000) and update their timestamps. Vendors will receive these records as normal listing updates. This will be a metered process to avoid inundating MLS Grid or vendor systems and is expected to run continuously for approximately five days.

 






Required Vendor Changes


1. Display expanded listing firm and broker attribution

Effective October 15, 2026, all NWMLS listings displayed pursuant to IDX or VOW, on web or mobile, must identify the listing firm using the following format:

Listing Broker: [firm name]; [broker name]; [contact phone]; [contact email]

Use the applicable listing data provided in the IDX/VOW feed. If a contact phone and/or contact email is not provided in the listing feed for a given listing, the missing value does not need to be displayed.


2. Meet attribution placement and prominence requirements

Use a font size and color that are as prominent as any call-to-action or contact-broker buttons

Be adjacent to any call-to-action or contact-broker button

Appear above the fold if no call-to-action or contact-broker button exists

Apply to both web and mobile IDX/VOW displays

 


Example of Updated On-Market Listing Brokerage Attribution


The fictional example below illustrates how the required attribution can appear adjacent to a contact-broker button. The surrounding website design is for demonstration purposes only


 




Implementation Timeline
 

Date

Change

September 17

Target date for the three new listing contact fields to become available through MLS Grid. MLS Grid will touch timestamps to force a resync of all on-market listings in a metered process over the course of several days, starting on September 17th.

October 15

New IDX/VOW listing attribution display requirements take effect.



Applicable NWMLS Listing Attribution Rules


For reference, the updated requirements are included below. Note that the sold listing brokerage attribution section of each rule is unchanged.

MLS Grid IDX Rule 22 - Identifying the Listing Brokerage


For Northwest MLS Participants only: all listings displayed pursuant to IDX on web or mobile shall identify the listing firm as follows: “Listing Broker: [firm name]; [broker name]; [contact phone]; [contact email].” The listing firm attribution must be in a font size and color that are as prominent as any call to action or contact broker buttons, and must be adjacent to any contact broker button. If no contact broker button exists, attribution must be made above the fold. When displaying a sold listing, the name of the cooperating brokerage (buyer brokerage firm) must be displayed adjacent to the listing firm name.

MLS Grid VOW Rule 19 - Identifying the Listing Brokerage


For Northwest MLS Participants only: all listings displayed pursuant to VOW on web or mobile shall identify the listing firm as follows: “Listing Broker: [firm name]; [broker name]; [contact phone]; [contact email].” The listing firm attribution must be in a font size and color that are as prominent as any call to action or contact broker buttons, and must be adjacent to any contact broker button. If no contact broker button exists, attribution must be made above the fold. When displaying a sold listing, the name of the cooperating brokerage (buyer brokerage firm) must be displayed adjacent to the listing firm name.



The existing requirement to identify NWMLS as the source of listing information remains in effect.



Please make the necessary changes to ensure your IDX/VOW displays comply with the updated attribution requirements by October 15, 2026.

 

Thank you,

Northwest MLS